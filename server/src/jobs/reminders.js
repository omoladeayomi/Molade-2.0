const cron = require('node-cron')
const prisma = require('../db')
const { sendEmail } = require('../services/email')
const { morningEmail } = require('../services/emailTemplates')
const { briefingFor } = require('../services/assistant')

const DAY = 24 * 60 * 60 * 1000
const REMIND_DAYS_AHEAD = 2 // "due soon" = due today, tomorrow or the day after

function startOfDay(date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

function dayKey(date) {
  const d = new Date(date)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// One morning email per student: Molade's AI briefing (if they want it) and the tasks due soon
// (if they want reminders). Only goes to confirmed email addresses.
// Safe to run more than once a day: a student who already got today's email is skipped.
async function sendMorningEmails() {
  const today = startOfDay(new Date())
  const todayKey = dayKey(today)

  const users = await prisma.user.findMany({
    where: {
      isVerified: true,
      AND: [
        { OR: [{ emailReminders: true }, { emailMorningBriefing: true }] },
        // "not sent today" must include never-sent (null): SQL's "<> today" alone would skip those
        { OR: [{ lastReminderOn: null }, { lastReminderOn: { not: todayKey } }] },
      ],
    },
    include: { tasks: { where: { status: { not: 'COMPLETED' } }, orderBy: { deadline: 'asc' } } },
  })

  let sent = 0
  for (const user of users) {
    if (user.tasks.length === 0) continue

    // Not yet past (a 9am exam today still counts at 8am) and due within the next few days
    const now = new Date()
    const dueSoon = user.emailReminders
      ? user.tasks
          .map((t) => ({ ...t, daysLeft: Math.round((startOfDay(t.deadline) - today) / DAY) }))
          .filter((t) => new Date(t.deadline) >= now && t.daysLeft <= REMIND_DAYS_AHEAD)
      : []

    let briefing = null
    if (user.emailMorningBriefing) {
      try {
        briefing = await briefingFor(user.id)
      } catch (err) {
        console.error(`Morning briefing failed for user ${user.id}:`, err.message)
      }
    }

    if (!briefing && dueSoon.length === 0) continue

    if (await sendEmail({ to: user.email, ...morningEmail(user, { briefing, dueSoon }) })) {
      await prisma.user.update({ where: { id: user.id }, data: { lastReminderOn: todayKey } })
      sent++
    }
  }
  console.log(`Morning emails: ${sent} sent`)
  return sent
}

// Every morning at 8:00 (UK time)
function scheduleReminders() {
  cron.schedule('0 8 * * *', () => {
    sendMorningEmails().catch((err) => console.error('Morning email job failed:', err))
  }, { timezone: 'Europe/London' })
  console.log('Morning emails scheduled for 08:00 every day')
}

module.exports = { sendMorningEmails, scheduleReminders }
