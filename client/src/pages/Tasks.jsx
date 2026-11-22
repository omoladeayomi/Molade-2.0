import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import api, { errorMessage } from '../api'
import AppLayout from '../components/AppLayout'
import Icon from '../components/Icon'
import Orb from '../components/Orb'
import TaskForm from '../components/TaskForm'
import TaskItem from '../components/TaskItem'

const FILTERS = [
  ['todo', 'To do'],
  ['done', 'Done'],
  ['all', 'All'],
]

// Unfinished tasks first (soonest deadline on top), completed ones last
function sortTasks(tasks) {
  return [...tasks].sort((a, b) => {
    const aDone = a.status === 'COMPLETED'
    const bDone = b.status === 'COMPLETED'
    if (aDone !== bDone) return aDone ? 1 : -1
    return new Date(a.deadline) - new Date(b.deadline)
  })
}

function Tasks() {
  const location = useLocation()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('todo')
  // null = form closed, 'new' = adding, or the task being edited.
  // Opens straight away when arriving from an "Add task" button.
  const [editing, setEditing] = useState(location.state?.openNew ? 'new' : null)

  useEffect(() => {
    api
      .get('/tasks')
      .then((res) => setTasks(res.data.tasks))
      .catch((err) => setError(errorMessage(err)))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave(fields) {
    if (editing === 'new') {
      const { data } = await api.post('/tasks', fields)
      setTasks((prev) => [...prev, data.task])
    } else {
      const { data } = await api.patch(`/tasks/${editing.id}`, fields)
      setTasks((prev) => prev.map((t) => (t.id === data.task.id ? data.task : t)))
    }
    setEditing(null)
  }

  async function handleUpdate(id, fields) {
    try {
      const { data } = await api.patch(`/tasks/${id}`, fields)
      setTasks((prev) => prev.map((t) => (t.id === id ? data.task : t)))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  async function handleDelete(id) {
    try {
      await api.delete(`/tasks/${id}`)
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      setError(errorMessage(err))
    }
  }

  const doneCount = tasks.filter((t) => t.status === 'COMPLETED').length
  const counts = { todo: tasks.length - doneCount, done: doneCount, all: tasks.length }
  const visible = sortTasks(tasks).filter((t) =>
    filter === 'all' ? true : filter === 'done' ? t.status === 'COMPLETED' : t.status !== 'COMPLETED',
  )

  return (
    <AppLayout>
      <main className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-5 py-8 md:px-12 md:py-9">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">{counts.todo} to do · {counts.done} done</span>
            <h1 className="text-[32px] font-semibold tracking-[-0.025em]">My tasks</h1>
          </div>
          <div className="flex gap-2.5">
            {tasks.length > 0 && (
              <Link to="/assistant" className="inline-flex h-10 items-center gap-2 rounded-[10px] border border-border-strong px-4 font-medium hover:border-primary-light">
                <Icon name="mic" size={16} className="text-primary" />
                Ask Molade
              </Link>
            )}
            {!editing && (
              <button onClick={() => setEditing('new')} className="inline-flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 font-semibold text-white hover:bg-primary-hover">
                <Icon name="plus" size={16} strokeWidth={2.2} />
                Add task
              </button>
            )}
          </div>
        </div>

        {error && <p role="alert" className="rounded-xl border border-overdue/30 bg-overdue/10 px-3.5 py-2.5 text-sm text-overdue">{error}</p>}

        {editing && (
          <TaskForm
            key={editing === 'new' ? 'new' : editing.id}
            task={editing === 'new' ? null : editing}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        )}

        <div className="flex w-fit gap-1 rounded-[10px] border border-border bg-surface p-0.75" role="tablist" aria-label="Filter tasks">
          {FILTERS.map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`h-8 rounded-[7px] px-3 text-[13px] font-medium ${filter === value ? 'bg-[#1a2232] text-text' : 'text-muted hover:text-text'}`}
            >
              {label} <span className="font-mono text-muted">{counts[value]}</span>
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-muted">Loading your tasks...</p>
        ) : tasks.length === 0 && !editing ? (
          <section className="flex flex-col items-center gap-5 rounded-2xl border border-border-blue bg-card px-6 py-14 text-center">
            <Orb size={56} rings={2} />
            <div className="flex flex-col gap-1.5">
              <h2 className="text-xl font-semibold">No tasks yet</h2>
              <p className="max-w-md text-muted">Add your first deadline and Molade will help you plan around it.</p>
            </div>
            <button onClick={() => setEditing('new')} className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 font-semibold text-white hover:bg-primary-hover">
              <Icon name="plus" size={16} strokeWidth={2.2} />
              Add your first task
            </button>
          </section>
        ) : visible.length === 0 ? (
          <p className="rounded-2xl border border-border bg-surface px-5 py-10 text-center text-muted">
            {filter === 'done' ? 'Nothing completed yet.' : 'All caught up. Nothing left to do.'}
          </p>
        ) : (
          <ul className="flex flex-col overflow-hidden rounded-2xl border border-border bg-[#0b0e13]">
            {visible.map((task) => (
              <TaskItem key={task.id} task={task} onUpdate={handleUpdate} onEdit={(t) => setEditing(t)} onDelete={handleDelete} />
            ))}
          </ul>
        )}
      </main>
    </AppLayout>
  )
}

export default Tasks
