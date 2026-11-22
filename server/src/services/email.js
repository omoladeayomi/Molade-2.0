const nodemailer = require('nodemailer')

// Sends email through Brevo's SMTP relay.
// Port 465 = encrypted from the first byte; port 587 (STARTTLS) has been seen to hang on some networks.
let transporter = null

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.MAIL_FROM)
}

function getTransporter() {
  if (!transporter) {
    const port = Number(process.env.SMTP_PORT || 465)
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // Never let a stuck mail server hang a request
      connectionTimeout: 15000,
      greetingTimeout: 15000,
      socketTimeout: 20000,
    })
  }
  return transporter
}

// Network blips (DNS timeouts, dropped connections) are worth one more try; a rejected login is not
const TEMPORARY_ERRORS = ['EDNS', 'ETIMEDOUT', 'ECONNECTION', 'ECONNRESET', 'ESOCKET', 'EAI_AGAIN']

// Returns true if sent. Never throws: a failed email must not break sign-up or the reminder job.
async function sendEmail({ to, subject, html, text }) {
  if (!isConfigured()) {
    console.log(`[email not configured] Would send "${subject}" to ${to}`)
    return false
  }
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      await getTransporter().sendMail({ from: process.env.MAIL_FROM, to, subject, html, text })
      console.log(`Email sent: "${subject}" to ${to}`)
      return true
    } catch (err) {
      const temporary = TEMPORARY_ERRORS.includes(err.code)
      console.error(`Email failed (attempt ${attempt}): "${subject}" to ${to}:`, err.code || '', err.message)
      if (!temporary || attempt === 2) return false
      await new Promise((resolve) => setTimeout(resolve, 3000))
    }
  }
  return false
}

module.exports = { sendEmail, isConfigured }
