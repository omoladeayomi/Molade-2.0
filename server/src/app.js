const path = require('path')
// Local secrets live in server/.env; on Vercel they come from the project's environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env') })
const crypto = require('crypto')
const express = require('express')
const cors = require('cors')
const authRoutes = require('./routes/auth')
const taskRoutes = require('./routes/tasks')
const assistantRoutes = require('./routes/assistant')
const adminRoutes = require('./routes/admin')
const { sendMorningEmails } = require('./jobs/reminders')

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET is missing from server/.env')
}

// The Express app on its own. index.js runs it on the laptop; api/index.js runs it on Vercel.
const app = express()

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

app.get('/api/health', (req, res) => {
  res.json({ message: 'API is running' })
})

app.use('/api/auth', authRoutes)
app.use('/api/tasks', taskRoutes)
app.use('/api/assistant', assistantRoutes)
app.use('/api/admin', adminRoutes)

// GET /api/cron/morning - called by Vercel Cron every morning (on the laptop, node-cron does it).
// Vercel sends "Authorization: Bearer <CRON_SECRET>", so nobody else can trigger a mass email.
app.get('/api/cron/morning', async (req, res) => {
  const expected = Buffer.from(`Bearer ${process.env.CRON_SECRET || ''}`)
  const given = Buffer.from(req.headers.authorization || '')
  const allowed = process.env.CRON_SECRET && given.length === expected.length && crypto.timingSafeEqual(given, expected)
  if (!allowed) return res.status(401).json({ error: 'Not allowed' })

  const sent = await sendMorningEmails()
  res.json({ sent })
})

// Catches any error so the server replies instead of crashing.
// Errors with a publicMessage (e.g. "Molade could not answer right now") are shown to the student.
app.use((err, req, res, next) => {
  if (err.publicMessage) {
    return res.status(err.status || 500).json({ error: err.publicMessage })
  }
  console.error(err)
  res.status(500).json({ error: 'Something went wrong on the server' })
})

module.exports = app
