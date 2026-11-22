import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import api, { errorMessage, requestBriefing } from '../api'
import { useAuth } from '../context/AuthContext'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import Orb from '../components/Orb'
import { CategoryTag, DoneButton, DueChip } from '../components/TaskBits'
import { daysUntil, formatTime, isOverdue, sameDay } from '../utils/deadline'
import { readVoiceSetting, speakText } from '../utils/voice'

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

// Molade's ranking first; tasks it hasn't ranked yet follow, soonest deadline first
function upNext(tasks) {
  return tasks
    .filter((t) => t.status !== 'COMPLETED')
    .sort((a, b) => (a.aiPriority ?? 999) - (b.aiPriority ?? 999) || new Date(a.deadline) - new Date(b.deadline))
}

function ProgressRing({ done, total }) {
  const r = 30
  const circumference = 2 * Math.PI * r
  const filled = total ? (done / total) * circumference : 0
  return (
    <div className="relative h-18 w-18 shrink-0">
      <svg width="72" height="72" viewBox="0 0 72 72" role="img" aria-label={`${done} of ${total} tasks completed`}>
        <circle cx="36" cy="36" r={r} fill="none" stroke="#1A212C" strokeWidth="7" />
        <circle cx="36" cy="36" r={r} fill="none" stroke="#3DD6A3" strokeWidth="7" strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`} transform="rotate(-90 36 36)" />
      </svg>
      <span className="absolute inset-0 grid place-items-center font-mono text-[15px] font-medium">{done}/{total}</span>
    </div>
  )
}

function Today() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [briefing, setBriefing] = useState(null) // { conversationId, reply }
  const [briefingError, setBriefingError] = useState('')
  const [playing, setPlaying] = useState(false)
  const [voiceNote, setVoiceNote] = useState('')
  const [error, setError] = useState('')
  const startedRef = useRef(false)
  const onPageRef = useRef(true)
  const audioRef = useRef(null)

  // Reads the briefing out loud. When it starts by itself (auto) and the browser blocks sound
  // because the page hasn't been clicked yet, the Play button is simply left for the student.
  async function startSpeaking(text, auto) {
    setVoiceNote('')
    setPlaying(true)
    try {
      const audio = await speakText(text)
      if (!onPageRef.current) {
        audio.pause() // the student left the page while the voice was loading
        return
      }
      audioRef.current = audio
      audio.onended = () => setPlaying(false)
    } catch (err) {
      setPlaying(false)
      if (!(auto && err.autoplayBlocked)) setVoiceNote('Voice unavailable right now.')
    }
  }

  useEffect(() => {
    onPageRef.current = true
    if (startedRef.current) return // React runs effects twice in development; only brief once
    startedRef.current = true

    api
      .get('/tasks')
      .then((res) => {
        setTasks(res.data.tasks)
        // Only ask Molade for a briefing when there is something to brief about
        if (res.data.tasks.some((t) => t.status !== 'COMPLETED')) {
          requestBriefing()
            .then(({ data }) => {
              setBriefing(data)
              if (onPageRef.current && readVoiceSetting()) startSpeaking(data.reply.spokenReply, true)
            })
            .catch((err) => setBriefingError(errorMessage(err)))
        }
      })
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))

    return () => {
      onPageRef.current = false
      audioRef.current?.pause()
    }
  }, [])

  function playBriefing() {
    if (playing) {
      audioRef.current?.pause()
      setPlaying(false)
      return
    }
    startSpeaking(briefing.reply.spokenReply, false)
  }

  async function toggleDone(task) {
    try {
      const { data } = await api.patch(`/tasks/${task.id}`, {
        status: task.status === 'COMPLETED' ? 'NOT_STARTED' : 'COMPLETED',
      })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? data.task : t)))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const unfinished = tasks.filter((t) => t.status !== 'COMPLETED')
  const doneCount = tasks.length - unfinished.length
  const dueSoon = unfinished.filter((t) => !isOverdue(t) && daysUntil(t.deadline) <= 3).length
  const overdue = unfinished.filter(isOverdue).length
  const plannedHours = unfinished.reduce((sum, t) => sum + (t.estimatedHours ?? 0), 0)

  const week = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() + i)
    return { date, due: unfinished.filter((t) => sameDay(t.deadline, date)) }
  })

  const next = upNext(tasks).slice(0, 5)
  const dateLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const firstName = user.name.split(' ')[0]

  return (
    <AppLayout>
      <main className="mx-auto flex w-full max-w-[1192px] flex-col gap-7 px-5 py-8 md:px-12 md:py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{dateLabel}</span>
            <h1 className="text-[32px] font-semibold tracking-[-0.025em]">{greeting()}, {firstName}</h1>
          </div>
          <div className="flex gap-2.5">
            <Link to="/assistant" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-border-strong px-4 font-medium hover:border-primary-light">
              <Icon name="mic" size={16} className="text-primary" />
              Ask Molade
            </Link>
            <Link to="/tasks" state={{ openNew: true }} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 font-semibold text-white hover:bg-primary-hover">
              <Icon name="plus" size={16} strokeWidth={2.2} />
              Add task
            </Link>
          </div>
        </div>

        {error && <p role="alert" className="rounded-xl border border-overdue/30 bg-overdue/10 px-3.5 py-2.5 text-sm text-overdue">{error}</p>}

        {loading ? (
          <p className="text-muted">Loading your day...</p>
        ) : tasks.length === 0 ? (
          <section className="flex flex-col items-center gap-5 rounded-2xl border border-border-blue bg-card px-6 py-14 text-center">
            <Orb size={56} rings={2} />
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-semibold">Let&apos;s plan your studies</h2>
              <p className="max-w-md text-muted">Add your coursework, exams and deadlines. Molade will tell you what to work on first, and why.</p>
            </div>
            <Link to="/tasks" state={{ openNew: true }} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-white hover:bg-primary-hover">
              <Icon name="plus" size={16} strokeWidth={2.2} />
              Add your first task
            </Link>
          </section>
        ) : (
          <>
            <div className="grid gap-4 lg:grid-cols-3">
              <section className="flex items-start gap-6 rounded-2xl border border-border-blue bg-card p-6 lg:col-span-2" aria-label="Molade's briefing">
                <Orb size={48} rings={2} active={playing || (!briefing && !briefingError && unfinished.length > 0)} className="hidden sm:grid" />
                <div className="flex min-w-0 flex-col gap-3">
                  <span className="text-xs font-medium uppercase tracking-[0.08em] text-primary">Molade&apos;s briefing</span>
                  {briefing ? (
                    <>
                      <p className="text-[19px] font-medium leading-snug tracking-[-0.01em]">{briefing.reply.spokenReply}</p>
                      <div className="flex flex-wrap gap-2">
                        <button onClick={playBriefing} className="inline-flex h-9 items-center gap-2 rounded-full bg-primary-soft px-3.5 font-medium text-ice hover:bg-bubble">
                          <Icon name={playing ? 'stop' : 'play'} size={14} />
                          {playing ? 'Stop' : 'Play briefing'}
                        </button>
                        <button
                          onClick={() => navigate('/assistant', { state: { briefing } })}
                          className="inline-flex h-9 items-center rounded-full border border-border-strong px-3.5 font-medium hover:border-primary-light"
                        >
                          Ask a follow-up
                        </button>
                      </div>
                      {voiceNote && <p className="text-[13px] text-muted">{voiceNote}</p>}
                    </>
                  ) : briefingError ? (
                    <p className="text-muted">{briefingError}</p>
                  ) : unfinished.length === 0 ? (
                    <p className="text-[19px] font-medium leading-snug">Everything is done. Nice work, {firstName}.</p>
                  ) : (
                    <p className="text-muted">Molade is looking at your tasks...</p>
                  )}
                </div>
              </section>

              <section className="flex flex-col gap-4.5 rounded-2xl border border-border bg-surface p-6" aria-label="Your progress">
                <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">Progress</span>
                <div className="flex items-center gap-4.5">
                  <ProgressRing done={doneCount} total={tasks.length} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[15px] font-semibold">{overdue ? 'Needs attention' : doneCount === tasks.length ? 'All done' : 'Keep going'}</span>
                    <span className="text-[13px] text-muted">{doneCount} done · {unfinished.length} to do</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    [dueSoon, 'Due soon'],
                    [overdue, 'Overdue'],
                    [plannedHours ? `${Math.round(plannedHours)}h` : '–', 'Est. work'],
                  ].map(([value, label]) => (
                    <div key={label} className="flex flex-col gap-0.5 rounded-[10px] bg-[#12161e] p-2.5">
                      <span className={`font-mono text-xl font-medium ${label === 'Overdue' && overdue ? 'text-overdue' : ''}`}>{value}</span>
                      <span className="text-xs text-muted">{label}</span>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <section className="flex flex-col gap-3" aria-label="Deadlines this week">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold">Your week</h2>
                <span className="text-[13px] text-muted">Deadlines over the next 7 days</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
                {week.map(({ date, due }, i) => (
                  <div key={i} className={`flex min-h-24 flex-col gap-2.5 rounded-xl border p-3 ${i === 0 ? 'border-primary bg-[#0d1524]' : 'border-border bg-surface'}`}>
                    <span className={`text-xs font-medium ${i === 0 ? 'text-primary-light' : 'text-muted'}`}>
                      {date.toLocaleDateString('en-GB', { weekday: 'short' })} <span className="font-mono">{date.getDate()}</span>
                      {i === 0 && ' · Today'}
                    </span>
                    {due.slice(0, 2).map((t) => (
                      <span key={t.id} className="flex items-start gap-1.5 text-xs font-medium leading-snug">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: daysUntil(t.deadline) <= 3 ? '#F5B544' : '#4C8DFF' }} />
                        <span className="min-w-0 break-words">
                          {t.title}
                          {t.deadlineHasTime && <span className="font-mono font-normal text-muted"> · {formatTime(t.deadline)}</span>}
                        </span>
                      </span>
                    ))}
                    {due.length > 2 && <span className="text-xs text-muted">+{due.length - 2} more</span>}
                  </div>
                ))}
              </div>
            </section>

            <section className="flex flex-col gap-3" aria-label="Up next">
              <div className="flex items-baseline justify-between">
                <h2 className="text-base font-semibold">Up next</h2>
                <Link to="/tasks" className="inline-flex items-center gap-1 text-[13px] font-medium text-primary-light hover:text-text">
                  All tasks <Icon name="arrowRight" size={14} />
                </Link>
              </div>
              {next.length === 0 ? (
                <p className="rounded-2xl border border-border bg-surface px-5 py-8 text-center text-muted">Nothing left to do. Add a task when something new comes up.</p>
              ) : (
                <ul className="flex flex-col overflow-hidden rounded-2xl border border-border bg-[#0b0e13]">
                  {next.map((t) => (
                    <li key={t.id} className="flex flex-wrap items-center gap-4 border-b border-[#151b24] px-5 py-4 last:border-b-0">
                      <DoneButton task={t} onToggle={() => toggleDone(t)} />
                      <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <span className="text-[15px] font-medium">{t.title}</span>
                          <CategoryTag category={t.category} />
                        </div>
                        {t.aiPriority ? (
                          <span className="text-[13px] text-muted">
                            <span className="font-medium text-primary-light">Molade #{t.aiPriority}</span>
                            {t.aiReason && <> · {t.aiReason}</>}
                          </span>
                        ) : (
                          t.description && <span className="truncate text-[13px] text-muted">{t.description}</span>
                        )}
                      </div>
                      {t.estimatedHours != null && <span className="font-mono text-[13px] text-muted">~{t.estimatedHours}h</span>}
                      <DueChip task={t} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </>
        )}
      </main>
    </AppLayout>
  )
}

export default Today
