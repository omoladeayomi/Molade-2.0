const express = require('express')
const { waitUntil } = require('@vercel/functions')
const { z } = require('zod')
const prisma = require('../db')
const requireAuth = require('../middleware/requireAuth')
const { sendEmail } = require('../services/email')
const { taskAddedEmail } = require('../services/emailTemplates')

const router = express.Router()

// Every task route needs a logged-in user
router.use(requireAuth)

const CATEGORIES = ['Coursework', 'Exam', 'Project', 'Reading', 'Personal']
const STATUSES = ['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED']

const taskSchema = z.object({
  title: z.string().trim().min(1, 'Please enter a title').max(200, 'Title is too long'),
  description: z.string().trim().max(2000, 'Description is too long').nullish(),
  category: z.enum(CATEGORIES, 'Please choose a valid category').nullish(),
  deadline: z.coerce.date('Please enter a valid deadline'),
  // true when the student picked an exact time; otherwise the deadline is the end of that day
  deadlineHasTime: z.boolean().optional(),
  status: z.enum(STATUSES, 'Please choose a valid status').optional(),
})

// For edits, every field is optional (e.g. just changing the status)
const updateSchema = taskSchema.partial()

function validate(schema, req, res) {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return null
  }
  return result.data
}

// Finds a task only if it belongs to the logged-in user, so nobody can
// read or change someone else's task by guessing its ID
async function findOwnTask(req, res) {
  const id = Number(req.params.id)
  const task = Number.isInteger(id)
    ? await prisma.task.findFirst({ where: { id, userId: req.userId } })
    : null
  if (!task) res.status(404).json({ error: 'Task not found' })
  return task
}

// GET /api/tasks - the logged-in user's tasks, soonest deadline first
router.get('/', async (req, res) => {
  const tasks = await prisma.task.findMany({
    where: { userId: req.userId },
    orderBy: { deadline: 'asc' },
  })
  res.json({ tasks })
})

// POST /api/tasks - create a task
router.post('/', async (req, res) => {
  const data = validate(taskSchema, req, res)
  if (!data) return

  const task = await prisma.task.create({ data: { ...data, userId: req.userId }, include: { user: true } })
  const { user, ...plainTask } = task

  // Confirmation email in the background, only to confirmed addresses that want it
  // (waitUntil keeps Vercel's function alive until the email is sent)
  if (user.isVerified && user.emailTaskAdded) {
    waitUntil(sendEmail({ to: user.email, ...taskAddedEmail(user, plainTask) }))
  }

  res.status(201).json({ task: plainTask })
})

// PATCH /api/tasks/:id - edit a task
router.patch('/:id', async (req, res) => {
  const data = validate(updateSchema, req, res)
  if (!data) return
  if (!(await findOwnTask(req, res))) return

  const task = await prisma.task.update({ where: { id: Number(req.params.id) }, data })
  res.json({ task })
})

// DELETE /api/tasks/:id - delete a task
router.delete('/:id', async (req, res) => {
  if (!(await findOwnTask(req, res))) return

  await prisma.task.delete({ where: { id: Number(req.params.id) } })
  res.status(204).end()
})

module.exports = router
