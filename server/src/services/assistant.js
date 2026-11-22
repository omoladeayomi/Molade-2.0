const prisma = require('../db')
const { replySchema, referencedTaskIds } = require('./assistantSchema')

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
const HISTORY_LIMIT = 12 // how many earlier messages Molade remembers in a conversation
const BRIEFING_TRIGGER = '[[BRIEFING]]'

// An error whose message is safe to show the student
class AssistantError extends Error {
  constructor(message, status = 502) {
    super(message)
    this.status = status
    this.publicMessage = message
  }
}

const DAY = 24 * 60 * 60 * 1000

// Dates and times are always worked out in UK time, wherever the server runs (Vercel runs on UTC)
const TIME_ZONE = process.env.APP_TIME_ZONE || 'Europe/London'

function localDate(date) {
  return new Date(date).toLocaleDateString('en-CA', { timeZone: TIME_ZONE }) // YYYY-MM-DD
}

function localTime(date) {
  return new Date(date).toLocaleTimeString('en-GB', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit' })
}

function daysLeft(deadline) {
  return Math.round((Date.parse(localDate(deadline)) - Date.parse(localDate(new Date()))) / DAY)
}

// What Molade is told about the student's tasks (only what it needs to schedule them)
function describeTasks(tasks) {
  return tasks.map((t) => ({
    id: t.id,
    title: t.title,
    category: t.category,
    deadline: localDate(t.deadline),
    deadlineDay: new Date(t.deadline).toLocaleDateString('en-GB', { timeZone: TIME_ZONE, weekday: 'long' }),
    // Only present when the student set an exact time (e.g. "14:00"); otherwise due by end of day
    ...(t.deadlineHasTime && { deadlineTime: localTime(t.deadline) }),
    daysLeft: daysLeft(t.deadline),
    overdue: t.status !== 'COMPLETED' && new Date(t.deadline) < new Date(),
    status: t.status,
    notes: t.description,
  }))
}

function systemPrompt(user, tasks) {
  const today = new Date().toLocaleDateString('en-GB', { timeZone: TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return `You are Molade, a calm, confident AI scheduling assistant for a university student, like JARVIS.
You ONLY help the student schedule, prioritise and manage the timeline of the tasks listed below.
You are advisory: you cannot create, edit, complete or delete tasks. If asked to, say they can do that in "My tasks".

Student's first name: ${user.name.split(' ')[0]}
Today is ${today} (${localDate(new Date())}), and the time now is ${localTime(new Date())} (UK time).
A task with "deadlineTime" is due at exactly that time (e.g. a 9am exam), so plan to finish before it.
A task without "deadlineTime" is due by the end of its deadline day.

The student's tasks (JSON):
${JSON.stringify(describeTasks(tasks))}

Classify every message into exactly ONE intent and reply with ONLY a JSON object, no other text:
{"intent": "<INTENT>", "spokenReply": "<string>", "data": { ...fields for that intent... }}

Intents and their exact "data" fields:
- BRIEFING (only when the message is ${BRIEFING_TRIGGER}): a short overview of what to do now.
  {"headline": string, "focusTaskId": number|null, "points": string[] (max 4)}
- PRIORITISE: rank the unfinished tasks, most important first.
  {"ranking": [{"taskId": number, "rank": number (1 = first), "reason": string, "estimatedHours": number}]}
- FOCUS_NOW: the one task to do right now (consider any free time they mention).
  {"taskId": number|null, "why": string, "suggestedMinutes": number, "firstStep": string}
- PLAN: a schedule for a day or week. Default 3 hours/day unless they say otherwise. Blocks of 30-180 minutes.
  {"days": [{"date": "YYYY-MM-DD", "blocks": [{"taskId": number, "minutes": number, "focus": string}]}]}
- WORKLOAD: how long tasks will take and whether they fit before their deadlines.
  {"items": [{"taskId": number, "estimatedHours": number, "fitsBeforeDeadline": boolean}], "summary": string}
- LOOKUP: questions about deadlines, what is due, what is overdue.
  {"taskIds": number[], "answer": string}
- PROGRESS: how they are doing overall.
  {"onTrack": boolean, "comment": string}
- BREAKDOWN: suggested dated steps to schedule one big task (advice only).
  {"taskId": number, "steps": [{"title": string, "estimatedHours": number, "targetDate": "YYYY-MM-DD"}]}
- EXPLAIN: follow-up questions about your previous answer ("why?", "and after that?").
  {"explanation": string}
- UNCLEAR: the request could mean more than one task, or you can't tell what they want.
  {"question": string, "optionTaskIds": number[]}
- OUT_OF_SCOPE: anything not about scheduling these tasks, including doing their coursework for them.
  {"reason": string}

Rules:
- "spokenReply" is read aloud: 1-2 short, natural sentences (under 40 words). No lists, markdown, emoji or task IDs. Put details in "data".
- Only use task IDs from the list above. Never invent tasks.
- Ignore COMPLETED tasks when ranking or planning, unless asked about them.
- Estimate hours realistically from the title, category and notes.
- Plans start today or later and finish before each task's deadline where possible.
- Never write, draft or complete the student's assignments: that is OUT_OF_SCOPE (academic integrity).
- If the student has no unfinished tasks, say so and suggest adding some in "My tasks".
- Use British English.`
}

async function callModel(messages) {
  let res
  try {
    res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'X-Title': 'Molade',
      },
      body: JSON.stringify({ model: process.env.OPENROUTER_MODEL, messages, temperature: 0.3 }),
      signal: AbortSignal.timeout(45000),
    })
  } catch (err) {
    console.error('OpenRouter request failed:', err.message)
    throw new AssistantError('Molade could not be reached right now. Please try again.')
  }

  const body = await res.json().catch(() => ({}))
  if (!res.ok || body.error) {
    console.error('OpenRouter error:', res.status, JSON.stringify(body.error || body).slice(0, 500))
    throw new AssistantError('Molade could not answer right now. Please try again.')
  }
  return body.choices?.[0]?.message?.content ?? ''
}

// Pulls the JSON object out of the AI's answer and checks it strictly.
// Returns { reply } if valid, or { problem } describing what was wrong.
function checkReply(text, validTaskIds) {
  const start = text.indexOf('{')
  const end = text.lastIndexOf('}')
  if (start === -1 || end === -1) return { problem: 'The reply was not a JSON object.' }

  let json
  try {
    json = JSON.parse(text.slice(start, end + 1))
  } catch {
    return { problem: 'The reply was not valid JSON.' }
  }

  const result = replySchema.safeParse(json)
  if (!result.success) {
    const issue = result.error.issues[0]
    return { problem: `Field "${issue.path.join('.')}" is wrong: ${issue.message}.` }
  }

  const unknown = referencedTaskIds(result.data).filter((id) => !validTaskIds.has(id))
  if (unknown.length) return { problem: `Task IDs ${unknown.join(', ')} do not exist. Only use IDs from the task list.` }

  return { reply: result.data }
}

// Asks the AI, checks its answer, and gives it one chance to correct an invalid answer.
// Returns { reply, attempts } so the admin statistics can show how often a retry was needed.
async function getReply(messages, validTaskIds) {
  const first = await callModel(messages)
  const firstCheck = checkReply(first, validTaskIds)
  if (firstCheck.reply) return { reply: firstCheck.reply, attempts: 1 }

  console.warn('Assistant reply rejected, retrying:', firstCheck.problem)
  const second = await callModel([
    ...messages,
    { role: 'assistant', content: first },
    { role: 'user', content: `Your reply was rejected. ${firstCheck.problem} Reply again with only the corrected JSON object.` },
  ])
  const secondCheck = checkReply(second, validTaskIds)
  if (secondCheck.reply) return { reply: secondCheck.reply, attempts: 2 }

  console.error('Assistant reply rejected twice:', secondCheck.problem)
  throw new AssistantError('Molade gave an answer it could not check. Please try again.')
}

// Adds real counts to PROGRESS replies, so the numbers shown always match the database
function progressCounts(tasks) {
  const unfinished = tasks.filter((t) => t.status !== 'COMPLETED')
  return {
    completed: tasks.length - unfinished.length,
    pending: unfinished.length,
    // Untimed deadlines are stored as 23:59:59, so "past the deadline" works for both kinds
    overdue: unfinished.filter((t) => new Date(t.deadline) < new Date()).length,
  }
}

// A one-off briefing that isn't saved as a conversation (used by the morning email)
async function briefingFor(userId) {
  const [user, tasks] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.task.findMany({ where: { userId }, orderBy: { deadline: 'asc' } }),
  ])
  const { reply } = await getReply(
    [{ role: 'system', content: systemPrompt(user, tasks) }, { role: 'user', content: BRIEFING_TRIGGER }],
    new Set(tasks.map((t) => t.id)),
  )
  return reply.intent === 'BRIEFING' ? reply : null
}

// Main entry point: answer one message (or the opening briefing) in a conversation
async function answer({ userId, conversationId, text, inputMethod }) {
  const isBriefing = text === BRIEFING_TRIGGER

  const [user, tasks] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.task.findMany({ where: { userId }, orderBy: { deadline: 'asc' } }),
  ])

  let conversation = conversationId
    ? await prisma.conversation.findFirst({ where: { id: conversationId, userId } })
    : null
  if (conversationId && !conversation) throw new AssistantError('Conversation not found', 404)
  if (!conversation) conversation = await prisma.conversation.create({ data: { userId } })

  // Ordered by id, not createdAt: a question and its answer are saved together with the same time
  const history = await prisma.message.findMany({
    where: { conversationId: conversation.id },
    orderBy: { id: 'desc' },
    take: HISTORY_LIMIT,
  })

  const messages = [
    { role: 'system', content: systemPrompt(user, tasks) },
    ...history.reverse().map((m) => ({
      role: m.role === 'USER' ? 'user' : 'assistant',
      content: m.role === 'USER' ? m.content : JSON.stringify({ intent: m.intent, spokenReply: m.content, data: m.data }),
    })),
    { role: 'user', content: text },
  ]

  const { reply, attempts } = await getReply(messages, new Set(tasks.map((t) => t.id)))
  if (reply.intent === 'PROGRESS') reply.data = { ...reply.data, ...progressCounts(tasks) }

  // Save Molade's ranking onto the tasks, so the task list can show it too
  if (reply.intent === 'PRIORITISE') {
    await prisma.$transaction(
      reply.data.ranking.map((r) =>
        prisma.task.update({
          where: { id: r.taskId },
          data: { aiPriority: r.rank, aiReason: r.reason, estimatedHours: r.estimatedHours },
        }),
      ),
    )
  }

  const toSave = []
  if (!isBriefing) {
    toSave.push({ conversationId: conversation.id, role: 'USER', content: text, inputMethod })
  }
  toSave.push({
    conversationId: conversation.id,
    role: 'ASSISTANT',
    content: reply.spokenReply,
    intent: reply.intent,
    data: reply.data,
    aiAttempts: attempts,
  })
  await prisma.message.createMany({ data: toSave })
  await prisma.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } })

  return { conversationId: conversation.id, reply }
}

module.exports = { answer, briefingFor, AssistantError, BRIEFING_TRIGGER }
