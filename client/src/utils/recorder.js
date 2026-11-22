// Records the microphone and returns a 16kHz mono 16-bit WAV file,
// which is the format Meta Muse Voice Transcribe needs.

const TARGET_RATE = 16000

export async function startRecording() {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
  })
  const context = new AudioContext()
  const source = context.createMediaStreamSource(stream)
  const processor = context.createScriptProcessor(4096, 1, 1)
  const chunks = []

  processor.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)))
  source.connect(processor)
  processor.connect(context.destination)

  // Call the returned function to stop recording and get the WAV
  return async function stop() {
    processor.disconnect()
    source.disconnect()
    stream.getTracks().forEach((track) => track.stop())
    const rate = context.sampleRate
    await context.close()
    return encodeWav(downsample(merge(chunks), rate, TARGET_RATE), TARGET_RATE)
  }
}

function merge(chunks) {
  const out = new Float32Array(chunks.reduce((n, c) => n + c.length, 0))
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.length
  }
  return out
}

// Microphones usually record at 44.1kHz or 48kHz; average samples down to 16kHz
function downsample(samples, fromRate, toRate) {
  if (fromRate === toRate) return samples
  const ratio = fromRate / toRate
  const out = new Float32Array(Math.floor(samples.length / ratio))
  for (let i = 0; i < out.length; i++) {
    const start = Math.floor(i * ratio)
    const end = Math.min(Math.floor((i + 1) * ratio), samples.length)
    let sum = 0
    for (let j = start; j < end; j++) sum += samples[j]
    out[i] = sum / (end - start || 1)
  }
  return out
}

function encodeWav(samples, rate) {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)
  const write = (offset, text) => [...text].forEach((ch, i) => view.setUint8(offset + i, ch.charCodeAt(0)))

  write(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  write(8, 'WAVE')
  write(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true) // PCM
  view.setUint16(22, 1, true) // mono
  view.setUint32(24, rate, true)
  view.setUint32(28, rate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  write(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  samples.forEach((s, i) => {
    const clamped = Math.max(-1, Math.min(1, s))
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true)
  })
  return new Blob([buffer], { type: 'audio/wav' })
}
