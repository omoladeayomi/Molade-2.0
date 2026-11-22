const express = require('express')
const { waitUntil } = require('@vercel/functions')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const { z } = require('zod')
const prisma = require('../db')
const requireAuth = require('../middleware/requireAuth')
const { sendEmail } = require('../services/email')
const { welcomeEmail, verifyEmail, passwordResetEmail } = require('../services/emailTemplates')
const { createToken, hashToken, appLink } = require('../services/tokens')

const router = express.Router()

const VERIFY_LINK_HOURS = 24
const RESET_LINK_HOURS = 1
const HOUR = 60 * 60 * 1000

const email = z.string().trim().toLowerCase().pipe(z.email('Please enter a valid email'))

// bcrypt only uses the first 72 bytes of a password
const password = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(72, 'Password must be 72 characters or fewer')

const registerSchema = z.object({
  name: z.string().trim().min(1, 'Please enter your name').max(100, 'Name is too long'),
  email,
  password,
})

const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Please enter your password'),
})

const tokenSchema = z.object({ token: z.string().min(1, 'This link is missing its code') })
const forgotSchema = z.object({ email })
const resetSchema = z.object({ token: z.string().min(1, 'This link is missing its code'), password })

const settingsSchema = z
  .object({
    emailReminders: z.boolean(),
    emailMorningBriefing: z.boolean(),
    emailTaskAdded: z.boolean(),
  })
  .partial()

// Only these fields are ever sent back to the browser (never hashes or tokens)
function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isVerified: user.isVerified,
    emailReminders: user.emailReminders,
    emailMorningBriefing: user.emailMorningBriefing,
    emailTaskAdded: user.emailTaskAdded,
  }
}

function createLoginToken(user) {
  return jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })
}

// Checks the request body against a schema; sends a 400 and returns null if it's invalid
function validate(schema, req, res) {
  const result = schema.safeParse(req.body)
  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message })
    return null
  }
  return result.data
}

// Gives the user a fresh email-confirmation link (replacing any older one) and returns it
async function newVerificationLink(userId) {
  const { token, hash } = createToken()
  await prisma.user.update({
    where: { id: userId },
    data: { verificationTokenHash: hash, verificationTokenExpiresAt: new Date(Date.now() + VERIFY_LINK_HOURS * HOUR) },
  })
  return appLink('/verify-email', token)
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const data = validate(registerSchema, req, res)
  if (!data) return

  const existing = await prisma.user.findUnique({ where: { email: data.email } })
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' })
  }

  const passwordHash = await bcrypt.hash(data.password, 12)
  const user = await prisma.user.create({
    data: { name: data.name, email: data.email, passwordHash },
  })

  // Sent in the background: the student doesn't wait for it, and a failed email never blocks sign-up.
  // waitUntil keeps Vercel's function alive until the email is sent (on the laptop it changes nothing).
  waitUntil(
    newVerificationLink(user.id)
      .then((link) => sendEmail({ to: user.email, ...welcomeEmail(user, link) }))
      .catch((err) => console.error('Welcome email failed:', err)),
  )

  res.status(201).json({ token: createLoginToken(user), user: publicUser(user) })
})

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const data = validate(loginSchema, req, res)
  if (!data) return

  const user = await prisma.user.findUnique({ where: { email: data.email } })
  const passwordOk = user && (await bcrypt.compare(data.password, user.passwordHash))

  // Same message whether the email or the password is wrong,
  // so nobody can use this form to find out who has an account
  if (!passwordOk) {
    return res.status(401).json({ error: 'Incorrect email or password' })
  }

  res.json({ token: createLoginToken(user), user: publicUser(user) })
})

// GET /api/auth/me - who is logged in?
router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (!user) {
    return res.status(401).json({ error: 'Please log in' })
  }
  res.json({ user: publicUser(user) })
})

// POST /api/auth/verify-email - the link from the welcome email. Works logged in or out.
router.post('/verify-email', async (req, res) => {
  const data = validate(tokenSchema, req, res)
  if (!data) return

  const user = await prisma.user.findFirst({ where: { verificationTokenHash: hashToken(data.token) } })
  if (!user || user.verificationTokenExpiresAt < new Date()) {
    return res.status(400).json({ error: 'This link has expired or was already used. Send a new one from Settings.' })
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { isVerified: true, verificationTokenHash: null, verificationTokenExpiresAt: null },
  })
  res.json({ user: publicUser(updated) })
})

// POST /api/auth/resend-verification - send a new confirmation email
router.post('/resend-verification', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.userId } })
  if (user.isVerified) return res.json({ message: 'Your email is already confirmed' })

  const link = await newVerificationLink(user.id)
  const sent = await sendEmail({ to: user.email, ...verifyEmail(user, link) })
  if (!sent) return res.status(502).json({ error: 'We could not send the email right now. Please try again.' })
  res.json({ message: `We sent a new link to ${user.email}` })
})

// POST /api/auth/forgot-password
// Always gives the same answer, so this form can't be used to find out who has an account
router.post('/forgot-password', async (req, res) => {
  const data = validate(forgotSchema, req, res)
  if (!data) return

  const user = await prisma.user.findUnique({ where: { email: data.email } })
  if (user) {
    const { token, hash } = createToken()
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordResetTokenHash: hash, passwordResetTokenExpiresAt: new Date(Date.now() + RESET_LINK_HOURS * HOUR) },
    })
    await sendEmail({ to: user.email, ...passwordResetEmail(user, appLink('/reset-password', token)) })
  }
  res.json({ message: 'If an account exists for that email, we have sent a link to reset the password.' })
})

// POST /api/auth/reset-password - the link from the reset email
router.post('/reset-password', async (req, res) => {
  const data = validate(resetSchema, req, res)
  if (!data) return

  const user = await prisma.user.findFirst({ where: { passwordResetTokenHash: hashToken(data.token) } })
  if (!user || user.passwordResetTokenExpiresAt < new Date()) {
    return res.status(400).json({ error: 'This link has expired or was already used. Ask for a new one.' })
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash: await bcrypt.hash(data.password, 12),
      passwordResetTokenHash: null,
      passwordResetTokenExpiresAt: null,
      // Getting the reset email proves the address is theirs
      isVerified: true,
    },
  })
  res.json({ message: 'Your password has been changed. You can now log in.' })
})

// PATCH /api/auth/settings - email preferences
router.patch('/settings', requireAuth, async (req, res) => {
  const data = validate(settingsSchema, req, res)
  if (!data) return

  const user = await prisma.user.update({ where: { id: req.userId }, data })
  res.json({ user: publicUser(user) })
})

module.exports = router
