import { dueLabel } from '../utils/deadline'

// Small pieces shared by the Today and My tasks pages

export const CATEGORY_COLORS = {
  Coursework: '#3DD6A3',
  Exam: '#F5B544',
  Project: '#4C8DFF',
  Reading: '#A78BFA',
  Personal: '#F472B6',
}

const TONE_CLASS = {
  overdue: 'bg-overdue/15 text-overdue',
  soon: 'bg-soon/15 text-soon',
  normal: 'bg-primary/15 text-primary-light',
  done: 'bg-done/15 text-done',
}

export function DueChip({ task, className = '' }) {
  const due = dueLabel(task)
  return (
    <span className={`inline-flex min-w-27 justify-center rounded-full px-2.5 py-1 text-xs font-medium ${TONE_CLASS[due.tone]} ${className}`}>
      {due.text}
    </span>
  )
}

export function CategoryTag({ category }) {
  if (!category) return null
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: CATEGORY_COLORS[category] ?? '#8A97AB' }} />
      {category}
    </span>
  )
}

// The round "mark as done" button
export function DoneButton({ task, onToggle }) {
  const done = task.status === 'COMPLETED'
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={done ? `Mark "${task.title}" as not done` : `Mark "${task.title}" as done`}
      aria-pressed={done}
      className={`grid h-5.5 w-5.5 shrink-0 place-items-center rounded-full border-[1.5px] transition ${
        done ? 'border-done bg-done text-background' : 'border-[#3a475c] hover:border-primary-light'
      }`}
    >
      {done && (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12l5 5L20 7" />
        </svg>
      )}
    </button>
  )
}
