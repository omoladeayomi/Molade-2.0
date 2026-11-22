import { useState } from 'react'
import { formatDeadline } from '../utils/deadline'
import Icon from './Icon'
import { CategoryTag, DoneButton, DueChip } from './TaskBits'

const STATUS_OPTIONS = [
  ['NOT_STARTED', 'Not started'],
  ['IN_PROGRESS', 'In progress'],
  ['COMPLETED', 'Completed'],
]

const iconButton = 'grid h-9 w-9 place-items-center rounded-lg text-muted transition hover:bg-raised hover:text-text'

function TaskItem({ task, onUpdate, onEdit, onDelete }) {
  const [confirming, setConfirming] = useState(false)
  const done = task.status === 'COMPLETED'

  return (
    <li className="flex flex-wrap items-start gap-4 border-b border-[#151b24] px-5 py-4 last:border-b-0">
      <div className="pt-0.5">
        <DoneButton task={task} onToggle={() => onUpdate(task.id, { status: done ? 'NOT_STARTED' : 'COMPLETED' })} />
      </div>

      <div className="flex min-w-0 flex-[1_1_300px] flex-col gap-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h3 className={`text-[15px] font-medium ${done ? 'text-muted line-through' : ''}`}>{task.title}</h3>
          <CategoryTag category={task.category} />
        </div>
        <span className="font-mono text-xs text-subtle">{formatDeadline(task)}</span>
        {task.description && <p className="whitespace-pre-line break-words text-[13px] text-muted">{task.description}</p>}
        {!done && task.aiPriority && (
          <p className="text-[13px] text-muted">
            <span className="font-medium text-primary-light">Molade #{task.aiPriority}</span>
            {task.estimatedHours != null && <span className="font-mono"> · ~{task.estimatedHours}h</span>}
            {task.aiReason && <> · {task.aiReason}</>}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <DueChip task={task} />
        <select
          aria-label={`Status of "${task.title}"`}
          value={task.status}
          onChange={(e) => onUpdate(task.id, { status: e.target.value })}
          className="h-9 rounded-lg border border-border bg-surface px-2 text-[13px] text-text"
        >
          {STATUS_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>

        {confirming ? (
          <div className="flex items-center gap-2">
            <span className="text-[13px]">Delete this task?</span>
            <button onClick={() => onDelete(task.id)} className="h-9 rounded-lg bg-overdue/90 px-3 text-[13px] font-semibold text-background hover:bg-overdue">
              Delete
            </button>
            <button onClick={() => setConfirming(false)} className="h-9 rounded-lg border border-border px-3 text-[13px] font-medium">
              Keep
            </button>
          </div>
        ) : (
          <>
            <button onClick={() => onEdit(task)} aria-label={`Edit "${task.title}"`} title="Edit" className={iconButton}>
              <Icon name="edit" size={16} />
            </button>
            <button onClick={() => setConfirming(true)} aria-label={`Delete "${task.title}"`} title="Delete" className={`${iconButton} hover:text-overdue`}>
              <Icon name="trash" size={16} />
            </button>
          </>
        )}
      </div>
    </li>
  )
}

export default TaskItem
