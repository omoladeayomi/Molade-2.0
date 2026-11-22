const { AssistantError } = require('./assistant')

// ElevenLabs does both directions: Scribe for listening, Flash voices for speaking
const SPEECH_TO_TEXT_URL = 'https://api.elevenlabs.io/v1/speech-to-text'
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech'
// "George": a warm British voice. Change ELEVENLABS_VOICE_ID in .env to use another one.
const DEFAULT_VOICE_ID = 'JBFqnCBsd6RMkjVDRZzb'

// Distinctive single words from task titles (e.g. "COM814", "Smith", "dissertation").
// ElevenLabs only accepts short key terms, and single words are what help recognition most.
function keytermsFrom(titles) {
  const words = titles
    .flatMap((title) => title.split(/[^\p{L}\p{N}'-]+/u))
    .filter((w) => w.length >= 4 || /\d/.test(w))
  return [...new Set(['Molade', ...words])].slice(0, 50)
}

// Speech to text with ElevenLabs Scribe. Takes a WAV recording, plus the student's task titles
// so it can spell names like "COM814" correctly.
async function transcribe(wavBuffer, taskTitles = []) {
  const form = new FormData()
  form.append('model_id', 'scribe_v2')
  form.append('language_code', 'en')
  form.append('tag_audio_events', 'false')
  for (const term of keytermsFrom(taskTitles)) form.append('keyterms', term)
  form.append('file', new Blob([wavBuffer], { type: 'audio/wav' }), 'speech.wav')

  let res
  try {
    res = await fetch(SPEECH_TO_TEXT_URL, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY },
      body: form,
      signal: AbortSignal.timeout(30000),
    })
  } catch (err) {
    console.error('ElevenLabs speech-to-text request failed:', err.message)
    throw new AssistantError('Voice recognition could not be reached. Try again or type your question.')
  }

  if (!res.ok) {
    console.error('ElevenLabs speech-to-text error:', res.status, (await res.text()).slice(0, 300))
    throw new AssistantError('Voice recognition failed. Try again or type your question.')
  }
  const body = await res.json()
  return (body.text || '').trim()
}

// Text to speech with ElevenLabs. Returns MP3 audio.
async function speak(text) {
  const voiceId = process.env.ELEVENLABS_VOICE_ID || DEFAULT_VOICE_ID
  let res
  try {
    res = await fetch(`${ELEVENLABS_URL}/${voiceId}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': process.env.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      // Flash is the fastest model and uses half the credits
      body: JSON.stringify({ text, model_id: 'eleven_flash_v2_5' }),
      signal: AbortSignal.timeout(30000),
    })
  } catch (err) {
    console.error('ElevenLabs request failed:', err.message)
    throw new AssistantError('Voice unavailable right now.')
  }

  if (!res.ok) {
    console.error('ElevenLabs error:', res.status, (await res.text()).slice(0, 300))
    throw new AssistantError('Voice unavailable right now.')
  }
  return Buffer.from(await res.arrayBuffer())
}

module.exports = { transcribe, speak }
