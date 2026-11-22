const DAY = 24 * 60 * 60 * 1000
const HOUR = 60 * 60 * 1000

// Midnight at the start of a date, so we can count whole calendar days
function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

// Whole calendar days from today until a deadline (0 = today, negative = an earlier day)
export function daysUntil(deadline) {
  return Math.round((startOfDay(deadline) - startOfDay(new Date())) / DAY)
}

export function sameDay(a, b) {
  return startOfDay(a).getTime() === startOfDay(b).getTime()
}

// Past the deadline? Works for both kinds: untimed deadlines are stored as 23:59:59 that day
export function isOverdue(task) {
  return task.status !== 'COMPLETED' && new Date(task.deadline) < new Date()
}

// A short, human label for how urgent a task is, plus a tone for colouring it.
// Untimed deadlines count calendar days; a deadline with a time counts down hours on the day.
export function dueLabel(task) {
  if (task.status === 'COMPLETED') return { text: 'Done', tone: 'done' }
  if (isOverdue(task)) return { text: 'Overdue', tone: 'overdue' }

  const days = daysUntil(task.deadline)
  if (days === 0) {
    if (!task.deadlineHasTime) return { text: 'Due today', tone: 'soon' }
    const hours = Math.ceil((new Date(task.deadline) - new Date()) / HOUR)
    return { text: hours <= 1 ? 'Due within an hour' : `Due in ${hours} hours`, tone: 'soon' }
  }
  if (days === 1) return { text: 'Due tomorrow', tone: 'soon' }
  return { text: `Due in ${days} days`, tone: days <= 3 ? 'soon' : 'normal' }
}

export function formatTime(deadline) {
  return new Date(deadline).toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit', hour12: true })
}

// "Sun, 15 Nov 2026", plus ", 2:00 pm" when the student set a time
export function formatDeadline(task) {
  const date = new Date(task.deadline).toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  })
  return task.deadlineHasTime ? `${date}, ${formatTime(task.deadline)}` : date
}

// Local "YYYY-MM-DDTHH:mm" for a deadline, split for <input type="date"> and <input type="time">
function toLocalParts(deadline) {
  const d = new Date(deadline)
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString()
  return { date: local.slice(0, 10), time: local.slice(11, 16) }
}

export function toInputValue(deadline) {
  return toLocalParts(deadline).date
}

export function toTimeInputValue(deadline) {
  return toLocalParts(deadline).time
}
