import { useState } from 'react'
import { errorMessage } from '../api'
import { toInputValue, toTimeInputValue } from '../utils/deadline'
import { ErrorBox, inputClass } from './AuthForm'

export const CATEGORIES = ['Coursework', 'Exam', 'Project', 'Reading', 'Personal']

const labelClass = 'flex flex-col gap-1.5 text-sm font-medium text-[#b4c0d2]'

// Used for both adding a new task and editing an existing one
function TaskForm({ task, onSave, onCancel }) {
  const [title, setTitle] = useState(task?.title ?? '')
  const [description, setDescription] = useState(task?.description ?? '')
  const [category, setCategory] = useState(task?.category ?? 'Coursework')
  const [date, setDate] = useState(task ? toInputValue(task.deadline) : '')
  // Optional: empty means "due by the end of the day"
  const [time, setTime] = useState(task?.deadlineHasTime ? toTimeInputValue(task.deadline) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await onSave({
        title,
        description: description || null,
        category,
        // With a time: due at that time. Without: due by the end of the day.
        deadline: new Date(`${date}T${time || '23:59:59'}`).toISOString(),
        deadlineHasTime: Boolean(time),
      })
    } catch (err) {
      setError(errorMessage(err))
      setBusy(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-2xl border border-border-blue bg-card p-6">
      <h2 className="text-lg font-semibold">{task ? 'Edit task' : 'New task'}</h2>
      <ErrorBox message={error} />

      <label htmlFor="task-title" className={labelClass}>
        Title
        <input id="task-title" className={inputClass} required maxLength={200} autoFocus
          placeholder="e.g. Dissertation chapter 2"
          value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>

      <div className="grid gap-4 sm:grid-cols-3">
        <label htmlFor="task-date" className={labelClass}>
          Deadline
          <input id="task-date" type="date" className={inputClass} required
            value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label htmlFor="task-time" className={labelClass}>
          <span>Time <span className="font-normal text-subtle">(optional)</span></span>
          <span className="flex gap-2">
            <input id="task-time" type="time" className={`${inputClass} min-w-0 flex-1`}
              value={time} onChange={(e) => setTime(e.target.value)} />
            {time && (
              <button type="button" onClick={() => setTime('')} aria-label="Clear time"
                className="h-11.5 rounded-xl border border-border-strong px-3 text-[13px] text-muted hover:text-text">
                Clear
              </button>
            )}
          </span>
          <span className="text-xs font-normal text-subtle">{time ? `Due at ${time}` : 'Empty = due by end of day'}</span>
        </label>
        <label htmlFor="task-category" className={labelClass}>
          Category
          <select id="task-category" className={inputClass}
            value={category} onChange={(e) => setCategory(e.target.value)}>
            {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
          </select>
        </label>
      </div>

      <label htmlFor="task-description" className={labelClass}>
        <span>Notes <span className="font-normal text-subtle">(optional, helps Molade estimate the work)</span></span>
        <textarea id="task-description" className={`${inputClass} h-auto py-2.5`} rows={3} maxLength={2000}
          placeholder="e.g. 3,000 words, need 15 references, not started"
          value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>

      <div className="flex gap-3">
        <button type="submit" disabled={busy}
          className="h-11 rounded-xl bg-primary px-5 font-semibold text-white hover:bg-primary-hover disabled:opacity-60">
          {busy ? 'Saving...' : task ? 'Save changes' : 'Add task'}
        </button>
        <button type="button" onClick={onCancel}
          className="h-11 rounded-xl border border-border-strong px-5 font-medium hover:border-primary-light">
          Cancel
        </button>
      </div>
    </form>
  )
}

export default TaskForm
