import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import api, { errorMessage, requestBriefing } from '../api'
import AppLayout from '../components/AppLayout'
import AssistantReply from '../components/AssistantReply'
import Icon from '../components/Icon'
import Orb from '../components/Orb'
import { startRecording } from '../utils/recorder'
import { readVoiceSetting, saveVoiceSetting, speakText } from '../utils/voice'

const SUGGESTIONS = ['What should I do first?', 'Plan my week', "What's due this week?", 'How am I doing?', 'I have 2 hours free']
const WAVE = [8, 14, 22, 12, 26, 18, 28, 16, 24, 10, 20, 14, 22]

function toMessage(reply) {
  return { role: 'ASSISTANT', content: reply.spokenReply, intent: reply.intent, data: reply.data }
}

function Assistant() {
  const location = useLocation()
  // Arriving from "Ask a follow-up" on Today continues that briefing instead of starting a new one
  const [fromToday] = useState(() => location.state?.briefing ?? null)
  const [tasksById, setTasksById] = useState({})
  const [conversationId, setConversationId] = useState(fromToday?.conversationId ?? null)
  const [messages, setMessages] = useState(() => (fromToday ? [toMessage(fromToday.reply)] : []))
  const [text, setText] = useState('')
  const [thinking, setThinking] = useState(!fromToday)
  const [recording, setRecording] = useState(false)
  const [transcribing, setTranscribing] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceOn, setVoiceOn] = useState(readVoiceSetting)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const stopRecordingRef = useRef(null)
  const audioRef = useRef(null)
  const startedRef = useRef(false)
  const bottomRef = useRef(null)

  function stopSpeaking() {
    audioRef.current?.pause()
    setSpeaking(false)
  }

  // Molade reads a reply out loud (ElevenLabs). If the voice fails, the reply is still on screen.
  // auto = it started by itself; if the browser blocks sound before any click, stay quiet about it.
  async function say(sentence, auto = false) {
    stopSpeaking()
    setSpeaking(true)
    try {
      const audio = await speakText(sentence)
      audioRef.current = audio
      audio.onended = () => setSpeaking(false)
    } catch (err) {
      setSpeaking(false)
      if (!(auto && err.autoplayBlocked)) setNotice('Voice unavailable right now. Replies are still shown here.')
    }
  }

  // On opening: load task names, and unless continuing from Today, Molade speaks first
  useEffect(() => {
    if (startedRef.current) return // React runs effects twice in development; only brief once
    startedRef.current = true

    api.get('/tasks').then((res) => setTasksById(Object.fromEntries(res.data.tasks.map((t) => [t.id, t]))))

    if (!fromToday) {
      requestBriefing()
        .then(({ data }) => {
          setConversationId(data.conversationId)
          setMessages([toMessage(data.reply)])
          if (readVoiceSetting()) say(data.reply.spokenReply, true)
        })
        .catch((err) => setError(errorMessage(err)))
        .finally(() => setThinking(false))
    }
    return () => audioRef.current?.pause()
  }, [fromToday])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages, thinking])

  async function send(message, inputMethod = 'TEXT') {
    const trimmed = message.trim()
    if (!trimmed || thinking) return
    setError('')
    setNotice('')
    setText('')
    setMessages((prev) => [...prev, { role: 'USER', content: trimmed, inputMethod }])
    setThinking(true)
    try {
      const { data } = await api.post('/assistant/message', { conversationId, text: trimmed, inputMethod })
      setConversationId(data.conversationId)
      setMessages((prev) => [...prev, toMessage(data.reply)])
      if (voiceOn) say(data.reply.spokenReply)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setThinking(false)
    }
  }

  // Tap once to start listening, tap again to stop and send
  async function toggleRecording() {
    setError('')
    if (recording) {
      setRecording(false)
      setTranscribing(true)
      try {
        const wav = await stopRecordingRef.current()
        const { data } = await api.post('/assistant/transcribe', wav, { headers: { 'Content-Type': 'audio/wav' } })
        if (data.text) send(data.text, 'VOICE')
        else setError("I didn't catch that. Try again, a little closer to the microphone.")
      } catch (err) {
        setError(errorMessage(err))
      } finally {
        setTranscribing(false)
      }
      return
    }

    try {
      stopSpeaking()
      stopRecordingRef.current = await startRecording()
      setRecording(true)
    } catch {
      setError('Microphone access was blocked. Allow the microphone in your browser, or type your question.')
    }
  }

  function toggleVoice() {
    const next = !voiceOn
    setVoiceOn(next)
    if (!next) stopSpeaking()
    saveVoiceSetting(next)
  }

  const busy = thinking || transcribing
  const status = recording
    ? 'Listening... tap the button again when you are done'
    : transcribing
      ? 'Hearing you...'
      : thinking
        ? 'Molade is thinking...'
        : speaking
          ? 'Molade is speaking'
          : 'Ready. Tap the mic and ask about your schedule.'

  return (
    <AppLayout>
      <main className="mx-auto flex w-full max-w-[868px] flex-1 flex-col gap-6 px-5 pt-7 md:px-12">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-[-0.015em]">Ask Molade</h1>
          <button
            onClick={toggleVoice}
            aria-pressed={voiceOn}
            className={`inline-flex h-8.5 items-center gap-2 rounded-full border px-3 text-[13px] font-medium ${voiceOn ? 'border-border-strong text-ice' : 'border-border text-muted'}`}
          >
            <Icon name={voiceOn ? 'speaker' : 'speakerOff'} size={15} strokeWidth={2} />
            {voiceOn ? 'Voice on' : 'Voice off'}
          </button>
        </div>

        <div className="flex flex-col items-center gap-3.5">
          <Orb size={72} rings={3} active={recording || busy || speaking} />
          {recording ? (
            <div className="flex h-6 items-end gap-1" aria-hidden="true">
              {WAVE.map((h, i) => (
                <div key={i} className="wave-bar w-1 rounded-sm bg-primary" style={{ height: h, animationDelay: `${(i % 5) * 0.12}s` }} />
              ))}
            </div>
          ) : null}
          <p className="text-[13px] text-muted" aria-live="polite">{status}</p>
        </div>

        <div className="flex flex-1 flex-col gap-4" aria-live="polite">
          {messages.map((m, i) =>
            m.role === 'USER' ? (
              <div key={i} className="inline-flex max-w-[80%] items-center gap-2 self-end rounded-[16px_16px_4px_16px] bg-bubble px-4 py-2.5 text-[15px]">
                {m.inputMethod === 'VOICE' && (
                  <span role="img" aria-label="Spoken" className="text-primary-light"><Icon name="mic" size={14} strokeWidth={2} /></span>
                )}
                {m.content}
              </div>
            ) : (
              <AssistantReply key={i} message={m} tasksById={tasksById} onOption={(taskTitle) => send(taskTitle)} onReplay={() => say(m.content)} />
            ),
          )}
          <div ref={bottomRef} />
        </div>

        {error && <p role="alert" className="rounded-xl border border-overdue/30 bg-overdue/10 px-3.5 py-2.5 text-sm text-overdue">{error}</p>}
        {notice && <p className="text-sm text-muted">{notice}</p>}

        <div className="sticky bottom-0 flex flex-col gap-3 bg-background pb-5 pt-3">
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} disabled={busy || recording}
                className="h-8 rounded-full border border-[#1e2734] bg-surface px-3.5 text-[13px] text-[#b4c0d2] hover:border-primary-light hover:text-text disabled:opacity-50">
                {s}
              </button>
            ))}
          </div>

          <form onSubmit={(e) => { e.preventDefault(); send(text) }}
            className="flex items-center gap-2.5 rounded-[18px] border border-border-blue bg-card p-2">
            <button
              type="button"
              onClick={toggleRecording}
              disabled={busy}
              aria-label={recording ? 'Stop and send' : 'Tap to speak'}
              title={recording ? 'Stop and send' : 'Tap to speak'}
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:bg-primary-hover disabled:opacity-60 ${
                recording ? 'shadow-[0_0_0_6px_rgba(59,123,255,0.18),0_0_32px_rgba(59,123,255,0.55)]' : 'shadow-[0_0_24px_rgba(59,123,255,0.45)]'
              }`}
            >
              <Icon name={recording ? 'stop' : 'mic'} size={20} strokeWidth={2} />
            </button>
            <label htmlFor="assistant-input" className="sr-only">Ask Molade</label>
            <input
              id="assistant-input"
              className="h-11 min-w-0 flex-1 bg-transparent text-[15px] text-text outline-none placeholder:text-subtle"
              placeholder="Ask about your tasks and deadlines"
              value={text}
              onChange={(e) => setText(e.target.value)}
              disabled={recording}
              maxLength={1000}
            />
            <button type="submit" disabled={busy || recording || !text.trim()} aria-label="Send"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary-soft text-ice hover:bg-bubble disabled:opacity-40">
              <Icon name="send" size={18} strokeWidth={2} />
            </button>
          </form>
          <p className="text-center text-xs text-subtle">Molade gives advice only. Change tasks in My tasks. Voice by ElevenLabs.</p>
        </div>
      </main>
    </AppLayout>
  )
}

export default Assistant
