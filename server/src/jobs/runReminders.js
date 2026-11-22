// Sends today's morning emails (briefing + due soon) right now, instead of waiting for 8am.
// Run with: npm run reminders:now
require('dotenv').config()
const prisma = require('../db')
const { sendMorningEmails } = require('./reminders')

sendMorningEmails()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
