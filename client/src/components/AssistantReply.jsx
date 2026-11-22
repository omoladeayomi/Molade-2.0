import Icon from './Icon'
import Orb from './Orb'
import { CATEGORY_COLORS } from './TaskBits'

// Shows one of Molade's answers. The spoken sentence is always shown;
// the details underneath depend on which kind of request (intent) it was.

const LABELS = {
  BRIEFING: 'Briefing',
  PRIORITISE: 'Priorities',
  FOCUS_NOW: 'Do this now',
  PLAN: 'Plan',
  WORKLOAD: 'Workload',
  LOOKUP: 'Deadlines',
  PROGRESS: 'Progress',
  BREAKDOWN: 'Steps',
  EXPLAIN: 'Explanation',
  UNCLEAR: 'Which one?',
  OUT_OF_SCOPE: 'Not something I can help with',
}

function formatDay(isoDate) {
  return new Date(`${isoDate}T12:00:00`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

function minutesLabel(minutes) {
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h}h ${m}m` : `${h}h`
}

const pill = 'rounded-full px-2.5 py-0.5 text-xs font-medium'

function Details({ intent, data, task, onOption }) {
  const title = (id) => task(id)?.title ?? 'A deleted task'
  const color = (id) => CATEGORY_COLORS[task(id)?.category] ?? '#4C8DFF'

  switch (intent) {
    case 'BRIEFING':
      return (
        <div className="flex flex-col gap-2">
          <p className="font-semibold">{data.headline}</p>
          <ul className="flex flex-col gap-1.5 text-sm text-muted">
            {data.points.map((p, i) => (
              <li key={i} className="flex gap-2"><span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-primary-light" />{p}</li>
            ))}
          </ul>
        </div>
      )
    case 'PRIORITISE':
      return (
        <ol className="flex flex-col gap-3">
          {[...data.ranking].sort((a, b) => a.rank - b.rank).map((r) => (
            <li key={r.taskId} className="flex gap-3">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-primary font-mono text-[13px] font-medium text-white">{r.rank}</span>
              <div className="min-w-0">
                <p className="font-semibold">{title(r.taskId)} <span className="font-mono text-[13px] font-normal text-muted">· ~{r.estimatedHours}h</span></p>
                <p className="text-sm text-muted">{r.reason}</p>
              </div>
            </li>
          ))}
        </ol>
      )
    case 'FOCUS_NOW':
      return (
        <div className="flex flex-col gap-2 text-sm">
          {data.taskId != null && (
            <p className="text-base font-semibold">{title(data.taskId)} <span className="font-mono text-[13px] font-normal text-muted">· {minutesLabel(data.suggestedMinutes)}</span></p>
          )}
          <p className="text-muted">{data.why}</p>
          <p className="rounded-xl bg-inset px-3.5 py-2.5"><span className="font-semibold text-primary-light">First step:</span> {data.firstStep}</p>
        </div>
      )
    case 'PLAN':
      return (
        <div className="grid gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]">
          {data.days.map((day) => (
            <div key={day.date} className="flex flex-col gap-2.5 rounded-xl border border-[#172031] bg-inset p-3.5">
              <p className="text-xs font-semibold text-primary-light">{formatDay(day.date)}</p>
              {day.blocks.length === 0 && <p className="text-sm text-muted">Free day</p>}
              {day.blocks.map((b, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="w-0.75 shrink-0 rounded-full" style={{ background: color(b.taskId) }} />
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-[13px] font-semibold">{title(b.taskId)}</span>
                    <span className="text-xs text-muted">{b.focus}</span>
                    <span className="font-mono text-xs text-muted">{minutesLabel(b.minutes)}</span>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )
    case 'WORKLOAD':
      return (
        <div className="flex flex-col gap-2.5 text-sm">
          <ul className="flex flex-col gap-2">
            {data.items.map((item) => (
              <li key={item.taskId} className="flex flex-wrap items-center gap-2.5">
                <span className="font-semibold">{title(item.taskId)}</span>
                <span className="font-mono text-muted">~{item.estimatedHours}h</span>
                <span className={`${pill} ${item.fitsBeforeDeadline ? 'bg-done/15 text-done' : 'bg-overdue/15 text-overdue'}`}>
                  {item.fitsBeforeDeadline ? 'Fits before deadline' : 'At risk'}
                </span>
              </li>
            ))}
          </ul>
          <p className="text-muted">{data.summary}</p>
        </div>
      )
    case 'LOOKUP':
      return (
        <div className="flex flex-col gap-2.5 text-sm">
          {data.taskIds.length > 0 && (
            <ul className="flex flex-wrap gap-2">
              {data.taskIds.map((id) => (
                <li key={id} className="inline-flex items-center gap-1.5 rounded-full border border-border-strong px-2.5 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: color(id) }} />{title(id)}
                </li>
              ))}
            </ul>
          )}
          <p className="text-muted">{data.answer}</p>
        </div>
      )
    case 'PROGRESS':
      return (
        <div className="flex flex-col gap-2.5 text-sm">
          <div className="flex flex-wrap gap-2">
            <span className={`${pill} bg-done/15 text-done`}>{data.completed} done</span>
            <span className={`${pill} bg-primary/15 text-primary-light`}>{data.pending} to do</span>
            <span className={`${pill} bg-overdue/15 text-overdue`}>{data.overdue} overdue</span>
            <span className={`${pill} ${data.onTrack ? 'bg-done/15 text-done' : 'bg-soon/15 text-soon'}`}>
              {data.onTrack ? 'On track' : 'Needs attention'}
            </span>
          </div>
          <p className="text-muted">{data.comment}</p>
        </div>
      )
    case 'BREAKDOWN':
      return (
        <div className="flex flex-col gap-2.5 text-sm">
          <p className="font-semibold">{title(data.taskId)}</p>
          <ol className="flex flex-col gap-2">
            {data.steps.map((s, i) => (
              <li key={i} className="flex gap-3">
                <span className="w-24 shrink-0 font-mono text-xs leading-5 text-primary-light">{formatDay(s.targetDate)}</span>
                <span>{s.title} <span className="font-mono text-muted">· ~{s.estimatedHours}h</span></span>
              </li>
            ))}
          </ol>
        </div>
      )
    case 'EXPLAIN':
      return <p className="text-sm text-muted">{data.explanation}</p>
    case 'UNCLEAR':
      return (
        <div className="flex flex-col gap-2.5 text-sm">
          <p className="text-muted">{data.question}</p>
          <div className="flex flex-wrap gap-2">
            {data.optionTaskIds.map((id) => (
              <button key={id} onClick={() => onOption(title(id))}
                className="h-9 rounded-full border border-primary px-3.5 font-medium text-primary-light hover:bg-primary hover:text-white">
                {title(id)}
              </button>
            ))}
          </div>
        </div>
      )
    default:
      return null
  }
}

function AssistantReply({ message, tasksById, onOption, onReplay }) {
  const outOfScope = message.intent === 'OUT_OF_SCOPE'

  return (
    <article className="flex items-start gap-3.5">
      <Orb size={32} className="mt-0.5" />
      <div className="flex min-w-0 flex-1 flex-col gap-3.5 rounded-[4px_16px_16px_16px] border border-border-blue bg-card px-5 py-4.5">
        <div className="flex items-center justify-between gap-3">
          <span className={`text-[11px] font-semibold uppercase tracking-widest ${outOfScope ? 'text-subtle' : 'text-primary'}`}>
            {LABELS[message.intent] ?? 'Molade'}
          </span>
          {onReplay && (
            <button onClick={onReplay} aria-label="Play this answer out loud"
              className="inline-flex h-7 items-center gap-1.5 rounded-full bg-primary-soft px-2.5 text-xs text-ice hover:bg-bubble">
              <Icon name="play" size={11} /> Play
            </button>
          )}
        </div>
        <p className="text-base leading-relaxed">{message.content}</p>
        {!outOfScope && message.data && <Details intent={message.intent} data={message.data} task={(id) => tasksById[id]} onOption={onOption} />}
      </div>
    </article>
  )
}

export default AssistantReply
