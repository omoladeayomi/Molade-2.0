const express = require('express')
const prisma = require('../db')
const requireAdmin = require('../middleware/requireAdmin')

const router = express.Router()

router.use(requireAdmin)

const DAY = 24 * 60 * 60 * 1000

// Privacy rule (UK GDPR, data minimisation): admins see counts and statistics only.
// Nothing here returns task titles, notes, or anything a student said to Molade.

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const toCounts = (rows, key) => Object.fromEntries(rows.map((r) => [r[key] ?? 'UNKNOWN', r._count._all]))

// GET /api/admin/overview - app-wide numbers
router.get('/overview', async (req, res) => {
  const today = startOfDay(new Date())
  const since = new Date(today.getTime() - 29 * DAY)

  const [
    users, verified, admins, tasksByStatus, overdue, conversations,
    intents, inputMethods, retried, answers, recentSignups,
    reminders, briefings, taskAdded,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { isVerified: true } }),
    prisma.user.count({ where: { role: 'ADMIN' } }),
    prisma.task.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.task.count({ where: { status: { not: 'COMPLETED' }, deadline: { lt: new Date() } } }),
    prisma.conversation.count(),
    prisma.message.groupBy({ by: ['intent'], where: { role: 'ASSISTANT' }, _count: { _all: true } }),
    prisma.message.groupBy({ by: ['inputMethod'], where: { role: 'USER' }, _count: { _all: true } }),
    prisma.message.count({ where: { role: 'ASSISTANT', aiAttempts: 2 } }),
    prisma.message.count({ where: { role: 'ASSISTANT', aiAttempts: { not: null } } }),
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.user.count({ where: { emailReminders: true } }),
    prisma.user.count({ where: { emailMorningBriefing: true } }),
    prisma.user.count({ where: { emailTaskAdded: true } }),
  ])

  // Sign-ups per day for the last 30 days (including days with none)
  const signupCounts = {}
  for (const u of recentSignups) signupCounts[dayKey(u.createdAt)] = (signupCounts[dayKey(u.createdAt)] || 0) + 1
  const signupsByDay = Array.from({ length: 30 }, (_, i) => {
    const key = dayKey(new Date(since.getTime() + i * DAY))
    return { date: key, count: signupCounts[key] || 0 }
  })

  const status = toCounts(tasksByStatus, 'status')
  const methods = toCounts(inputMethods, 'inputMethod')

  res.json({
    users: { total: users, verified, admins },
    tasks: {
      total: Object.values(status).reduce((a, b) => a + b, 0),
      notStarted: status.NOT_STARTED || 0,
      inProgress: status.IN_PROGRESS || 0,
      completed: status.COMPLETED || 0,
      overdue,
    },
    assistant: {
      conversations,
      questions: (methods.TEXT || 0) + (methods.VOICE || 0),
      voice: methods.VOICE || 0,
      typed: methods.TEXT || 0,
      answers,
      retried,
      intents: toCounts(intents, 'intent'),
    },
    emails: { reminders, briefings, taskAdded, of: users },
    signupsByDay,
  })
})

// GET /api/admin/users - every account with counts (no task or chat content)
router.get('/users', async (req, res) => {
  const [users, doneCounts, lastTask, lastChat] = await Promise.all([
    prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, name: true, email: true, role: true, isVerified: true, createdAt: true,
        _count: { select: { tasks: true, conversations: true } },
      },
    }),
    prisma.task.groupBy({ by: ['userId'], where: { status: 'COMPLETED' }, _count: { _all: true } }),
    prisma.task.groupBy({ by: ['userId'], _max: { updatedAt: true } }),
    prisma.conversation.groupBy({ by: ['userId'], _max: { updatedAt: true } }),
  ])

  const done = Object.fromEntries(doneCounts.map((r) => [r.userId, r._count._all]))
  const taskAt = Object.fromEntries(lastTask.map((r) => [r.userId, r._max.updatedAt]))
  const chatAt = Object.fromEntries(lastChat.map((r) => [r.userId, r._max.updatedAt]))

  res.json({
    users: users.map((u) => {
      const times = [u.createdAt, taskAt[u.id], chatAt[u.id]].filter(Boolean).map((d) => new Date(d).getTime())
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isVerified: u.isVerified,
        createdAt: u.createdAt,
        lastActiveAt: new Date(Math.max(...times)),
        tasks: u._count.tasks,
        tasksDone: done[u.id] || 0,
        conversations: u._count.conversations,
      }
    }),
  })
})

// DELETE /api/admin/users/:id - remove an account and all its data (tasks, conversations)
router.delete('/users/:id', async (req, res) => {
  const id = Number(req.params.id)
  if (!Number.isInteger(id)) return res.status(404).json({ error: 'Account not found' })
  if (id === req.userId) return res.status(400).json({ error: "You can't delete your own admin account here" })

  const target = await prisma.user.findUnique({ where: { id }, select: { role: true } })
  if (!target) return res.status(404).json({ error: 'Account not found' })
  if (target.role === 'ADMIN') return res.status(400).json({ error: 'Remove admin from this account first' })

  await prisma.user.delete({ where: { id } })
  res.status(204).end()
})

module.exports = router
