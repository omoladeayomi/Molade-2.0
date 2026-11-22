const express = require('express')
const { z } = require('zod')
const prisma = require('../db')
const requireAuth = require('../middleware/requireAuth')
const { answer, BRIEFING_TRIGGER } = require('../services/assistant')
const { transcribe, speak } = require('../services/voice')

const router = express.Router()

router.use(requireAuth)

const messageSchema = z.object({
  conversationId: z.number().int().nullish(),
  text: z.string().trim().min(1, 'Please say or type something').max(1000, 'That message is too long'),
  inputMethod: z.enum(['TEXT', 'VOICE']).default('TEXT'),
})

const speakSchema = z.object({
  text: z.string().trim().min(1).max(600),
})

function validate(schema, req, res) {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return null
  }
  return result.data
}

// POST /api/assistant/briefing - start a new conversation; Molade speaks first
router.post('/briefing', async (req, res) => {
  const result = await answer({ userId: req.userId, text: BRIEFING_TRIGGER })
  res.json(result)
})

// POST /api/assistant/message - the student says or types something
router.post('/message', async (req, res) => {
  const data = validate(messageSchema, req, res)
  if (!data) return
  if (data.text === BRIEFING_TRIGGER) return res.status(400).json({ error: 'Invalid message' })

  const result = await answer({ userId: req.userId, ...data })
  res.json(result)
})

// POST /api/assistant/transcribe - a WAV recording in, the words that were said out
router.post('/transcribe', express.raw({ type: 'audio/wav', limit: '10mb' }), async (req, res) => {
  if (!Buffer.isBuffer(req.body) || req.body.length < 100) {
    return res.status(400).json({ error: 'No recording received' })
  }
  // The student's task titles help speech recognition spell words like module names
  const tasks = await prisma.task.findMany({ where: { userId: req.userId }, select: { title: true } })
  const text = await transcribe(req.body, tasks.map((t) => t.title))
  res.json({ text })
})

// POST /api/assistant/speak - text in, Molade's voice (MP3) out
router.post('/speak', async (req, res) => {
  const data = validate(speakSchema, req, res)
  if (!data) return

  const audio = await speak(data.text)
  res.set('Content-Type', 'audio/mpeg').send(audio)
})

module.exports = router
