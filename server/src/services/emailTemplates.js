// Molade's emails, in the app's black-and-blue look.
// Email apps ignore most modern CSS, so these use simple tables and inline styles on purpose.

const APP_URL = () => process.env.APP_URL || 'http://localhost:5173'

const C = {
  bg: '#07080B',
  card: '#0D121B',
  inset: '#0A0E15',
  border: '#1E2A3D',
  text: '#E8EDF5',
  muted: '#8A97AB',
  blue: '#3B7BFF',
  ice: '#9CC2FF',
  soft: '#16233A',
  soon: '#F5C46A',
  overdue: '#FF7A6E',
}

const FONT = "'Geist', 'Segoe UI', Helvetica, Arial, sans-serif"

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

const firstName = (user) => user.name.split(' ')[0]

// Dates and times in emails are shown in UK time, wherever the server runs (Vercel runs on UTC)
const TIME_ZONE = process.env.APP_TIME_ZONE || 'Europe/London'

function formatDay(date) {
  return new Date(date).toLocaleDateString('en-GB', { timeZone: TIME_ZONE, weekday: 'short', day: 'numeric', month: 'short' })
}

// ", 2:00 pm" when the student set an exact time, otherwise nothing (due by end of day)
function timeSuffix(task) {
  if (!task.deadlineHasTime) return ''
  return `, ${new Date(task.deadline).toLocaleTimeString('en-GB', { timeZone: TIME_ZONE, hour: 'numeric', minute: '2-digit', hour12: true })}`
}

function dueText(daysLeft) {
  if (daysLeft < 0) return 'Overdue'
  if (daysLeft === 0) return 'Due today'
  if (daysLeft === 1) return 'Due tomorrow'
  return `Due in ${daysLeft} days`
}

function button(label, href) {
  return `<a href="${href}" style="display:inline-block;background:${C.blue};color:#FFFFFF;text-decoration:none;font-weight:600;font-size:15px;padding:12px 22px;border-radius:10px;">${label}</a>`
}

function eyebrow(text) {
  return `<p style="margin:0 0 8px;font-size:12px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:${C.blue};">${text}</p>`
}

function heading(html) {
  return `<h1 style="margin:0 0 12px;font-size:25px;line-height:1.25;font-weight:600;letter-spacing:-0.02em;color:${C.text};">${html}</h1>`
}

function paragraph(html, extra = '') {
  return `<p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:${C.muted};${extra}">${html}</p>`
}

function smallPrint(html) {
  return `<p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:${C.muted};">${html}</p>`
}

// A plain link, shown under buttons so it still works if an email app hides the button
function fallbackLink(url) {
  return smallPrint(`If the button doesn't work, copy this link into your browser:<br><a href="${url}" style="color:${C.ice};word-break:break-all;">${url}</a>`)
}

function layout({ preheader, body, settingsFooter = true }) {
  const footer = settingsFooter
    ? `You're getting this because you have a Molade account. <a href="${APP_URL()}/settings" style="color:${C.ice};">Manage email settings</a>.`
    : 'You\'re getting this because of a request on your Molade account.'

  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><title>Molade</title></head>
<body style="margin:0;padding:0;background:${C.bg};">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.bg};">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;font-family:${FONT};color:${C.text};">
    <tr><td style="padding:0 4px 24px;">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td style="width:26px;height:26px;border-radius:13px;background:${C.blue};box-shadow:0 0 14px rgba(76,141,255,0.6);"></td>
        <td style="padding-left:10px;font-size:18px;font-weight:700;letter-spacing:-0.02em;color:${C.text};">Molade</td>
      </tr></table>
    </td></tr>
    <tr><td style="background:${C.card};border:1px solid ${C.border};border-radius:16px;padding:32px 28px;">
      ${body}
    </td></tr>
    <tr><td style="padding:20px 4px 0;font-size:12px;line-height:1.6;color:${C.muted};">
      ${footer} Molade is an AI study planner for university students.
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`
}

// ---- Welcome (with "confirm your email") ----

function welcomeEmail(user, verifyUrl) {
  const name = escapeHtml(firstName(user))
  const steps = [
    ['Confirm your email', 'So we can send you deadline reminders and help you reset your password.'],
    ['Add your deadlines', 'Coursework, exams, reading. Add notes like word counts so Molade can estimate the work.'],
    ['Ask Molade what to do first', 'Tap the mic and ask "What should I do first?" or "Plan my week".'],
  ]

  const html = layout({
    preheader: `Welcome to Molade, ${firstName(user)}. Confirm your email to get reminders.`,
    body: `
      ${eyebrow("You're in")}
      ${heading(`Welcome to Molade, ${name}`)}
      ${paragraph('Your account is ready. Molade turns your deadlines into a plan, then talks you through it.', 'margin-bottom:24px;')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        ${steps.map(([title, text], i) => `
        <tr>
          <td valign="top" style="width:36px;padding:0 0 16px;">
            <div style="width:26px;height:26px;line-height:26px;border-radius:13px;background:${C.soft};color:${C.ice};text-align:center;font-size:13px;font-weight:600;">${i + 1}</div>
          </td>
          <td valign="top" style="padding:2px 0 16px;">
            <p style="margin:0 0 2px;font-size:15px;font-weight:600;color:${C.text};">${title}</p>
            <p style="margin:0;font-size:14px;line-height:1.5;color:${C.muted};">${text}</p>
          </td>
        </tr>`).join('')}
      </table>
      ${button('Confirm my email', verifyUrl)}
      ${fallbackLink(verifyUrl)}`,
  })

  const text = `Welcome to Molade, ${firstName(user)}!

Your account is ready. Confirm your email so we can send you deadline reminders:
${verifyUrl}

Then add your deadlines and ask Molade "What should I do first?"`

  return { subject: `Welcome to Molade, ${firstName(user)}`, html, text }
}

// ---- Confirm your email (resent from Settings) ----

function verifyEmail(user, verifyUrl) {
  const html = layout({
    preheader: 'Confirm your email address for Molade.',
    settingsFooter: false,
    body: `
      ${eyebrow('Confirm your email')}
      ${heading('One click and you\'re set')}
      ${paragraph(`Hi ${escapeHtml(firstName(user))}, confirm this is your email so Molade can send you deadline reminders. The link works for 24 hours.`)}
      ${button('Confirm my email', verifyUrl)}
      ${fallbackLink(verifyUrl)}
      ${smallPrint("Didn't ask for this? You can ignore this email.")}`,
  })
  const text = `Hi ${firstName(user)}, confirm your email for Molade (link works for 24 hours):\n${verifyUrl}\n\nDidn't ask for this? Ignore this email.`
  return { subject: 'Confirm your email for Molade', html, text }
}

// ---- Password reset ----

function passwordResetEmail(user, resetUrl) {
  const html = layout({
    preheader: 'Reset your Molade password. The link works for 1 hour.',
    settingsFooter: false,
    body: `
      ${eyebrow('Password reset')}
      ${heading('Reset your password')}
      ${paragraph(`Hi ${escapeHtml(firstName(user))}, we got a request to reset your Molade password. The link works for 1 hour and can only be used once.`)}
      ${button('Choose a new password', resetUrl)}
      ${fallbackLink(resetUrl)}
      ${smallPrint("Didn't ask for this? Ignore this email. Your password won't change.")}`,
  })
  const text = `Hi ${firstName(user)}, reset your Molade password (link works for 1 hour, once):\n${resetUrl}\n\nDidn't ask for this? Ignore this email. Your password won't change.`
  return { subject: 'Reset your Molade password', html, text }
}

// ---- Task added confirmation ----

function taskAddedEmail(user, task) {
  const date = new Date(task.deadline).toLocaleDateString('en-GB', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) + timeSuffix(task)
  const html = layout({
    preheader: `Added: ${task.title}, due ${date}`,
    body: `
      ${eyebrow('Task added')}
      ${heading(escapeHtml(task.title))}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:${C.inset};border:1px solid ${C.border};border-radius:12px;">
        <tr><td style="padding:16px 18px;">
          <p style="margin:0 0 6px;font-size:13px;color:${C.muted};">Due</p>
          <p style="margin:0 0 14px;font-size:15px;font-weight:600;color:${C.text};">${date}</p>
          ${task.category ? `<p style="margin:0 0 6px;font-size:13px;color:${C.muted};">Category</p><p style="margin:0 0 14px;font-size:15px;color:${C.text};">${escapeHtml(task.category)}</p>` : ''}
          ${task.description ? `<p style="margin:0 0 6px;font-size:13px;color:${C.muted};">Notes</p><p style="margin:0;font-size:15px;line-height:1.5;color:${C.text};white-space:pre-line;">${escapeHtml(task.description)}</p>` : ''}
        </td></tr>
      </table>
      ${paragraph("We'll remind you before it's due. Ask Molade where it fits in your week.")}
      ${button('Ask Molade', `${APP_URL()}/assistant`)}`,
  })
  const text = `Task added: ${task.title}\nDue: ${date}${task.category ? `\nCategory: ${task.category}` : ''}\n\nWe'll remind you before it's due.`
  return { subject: `Added: ${task.title}`, html, text }
}

// ---- Morning email: Molade's briefing and/or what's due soon ----
// briefing: Molade's BRIEFING reply ({ spokenReply, data: { points } }) or null
// dueSoon: [{ title, category, deadline, daysLeft, estimatedHours }]

function morningEmail(user, { briefing, dueSoon }) {
  const name = escapeHtml(firstName(user))

  const briefingBlock = briefing ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;background:${C.inset};border:1px solid ${C.border};border-radius:12px;">
        <tr><td style="padding:18px 20px;">
          <p style="margin:0 0 8px;font-size:11px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:${C.blue};">Molade's briefing</p>
          <p style="margin:0 0 ${briefing.data.points.length ? '12px' : '0'};font-size:17px;line-height:1.5;font-weight:500;color:${C.text};">${escapeHtml(briefing.spokenReply)}</p>
          ${briefing.data.points.map((p) => `<p style="margin:0 0 6px;font-size:14px;line-height:1.5;color:${C.muted};">&bull;&nbsp; ${escapeHtml(p)}</p>`).join('')}
        </td></tr>
      </table>` : ''

  const dueBlock = dueSoon.length ? `
      <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:${C.text};">Due soon</p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 28px;">
        ${dueSoon.map((t) => `
        <tr><td style="padding:12px 0;border-top:1px solid ${C.border};">
          <p style="margin:0 0 4px;font-size:15px;font-weight:600;color:${C.text};">${escapeHtml(t.title)}</p>
          <p style="margin:0;font-size:13px;color:${C.muted};">
            <span style="color:${t.daysLeft <= 0 ? C.overdue : C.soon};font-weight:600;">${dueText(t.daysLeft)}</span> · ${formatDay(t.deadline)}${timeSuffix(t)}${t.category ? ` · ${escapeHtml(t.category)}` : ''}${t.estimatedHours != null ? ` · about ${t.estimatedHours}h of work` : ''}
          </p>
        </td></tr>`).join('')}
      </table>` : ''

  const headline = dueSoon.length === 1
    ? `${escapeHtml(dueSoon[0].title)} is ${dueText(dueSoon[0].daysLeft).toLowerCase()}`
    : dueSoon.length > 1
      ? `${dueSoon.length} tasks are due soon`
      : 'Here\'s your plan for today'

  const html = layout({
    preheader: briefing ? briefing.spokenReply : dueSoon.map((t) => `${t.title}: ${dueText(t.daysLeft)}`).join(' · '),
    body: `
      ${eyebrow(new Date().toLocaleDateString('en-GB', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long' }))}
      ${heading(headline)}
      ${paragraph(`Morning, ${name}.${briefing ? '' : ' Here\'s what\'s coming up.'}`)}
      ${briefingBlock}
      ${dueBlock}
      ${button('Open Molade', `${APP_URL()}/today`)}`,
  })

  const text = [
    `Morning, ${firstName(user)}.`,
    briefing ? `\nMolade's briefing: ${briefing.spokenReply}\n${briefing.data.points.map((p) => `- ${p}`).join('\n')}` : '',
    dueSoon.length ? `\nDue soon:\n${dueSoon.map((t) => `- ${t.title}: ${dueText(t.daysLeft)}`).join('\n')}` : '',
    `\nOpen Molade: ${APP_URL()}/today`,
  ].join('\n')

  const subject = dueSoon.length === 1
    ? `${dueSoon[0].title} is ${dueText(dueSoon[0].daysLeft).toLowerCase()}`
    : dueSoon.length > 1
      ? `${dueSoon.length} tasks due soon`
      : `Your plan for today, ${firstName(user)}`

  return { subject, html, text }
}

module.exports = { welcomeEmail, verifyEmail, passwordResetEmail, taskAddedEmail, morningEmail }
