const { z } = require('zod')

// The 11 kinds of request Molade understands. Every reply must be exactly one of these,
// with the data fields for that intent. Anything else is rejected before it reaches the student.

const taskId = z.number().int()
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
const hours = z.number().min(0).max(500)

const INTENTS = {
  BRIEFING: z.object({
    headline: z.string(),
    focusTaskId: taskId.nullable(),
    points: z.array(z.string()).max(4),
  }),
  PRIORITISE: z.object({
    ranking: z.array(z.object({
      taskId,
      rank: z.number().int().min(1),
      reason: z.string(),
      estimatedHours: hours,
    })),
  }),
  FOCUS_NOW: z.object({
    taskId: taskId.nullable(),
    why: z.string(),
    suggestedMinutes: z.number().int().min(0).max(600),
    firstStep: z.string(),
  }),
  PLAN: z.object({
    days: z.array(z.object({
      date: isoDate,
      blocks: z.array(z.object({
        taskId,
        minutes: z.number().int().min(5).max(600),
        focus: z.string(),
      })),
    })),
  }),
  WORKLOAD: z.object({
    items: z.array(z.object({
      taskId,
      estimatedHours: hours,
      fitsBeforeDeadline: z.boolean(),
    })),
    summary: z.string(),
  }),
  LOOKUP: z.object({
    taskIds: z.array(taskId),
    answer: z.string(),
  }),
  PROGRESS: z.object({
    onTrack: z.boolean(),
    comment: z.string(),
  }),
  BREAKDOWN: z.object({
    taskId,
    steps: z.array(z.object({
      title: z.string(),
      estimatedHours: hours,
      targetDate: isoDate,
    })),
  }),
  EXPLAIN: z.object({
    explanation: z.string(),
  }),
  UNCLEAR: z.object({
    question: z.string(),
    optionTaskIds: z.array(taskId),
  }),
  OUT_OF_SCOPE: z.object({
    reason: z.string(),
  }),
}

const INTENT_NAMES = Object.keys(INTENTS)

// A reply = { intent, spokenReply, data }, where data must match the intent
const replySchema = z.discriminatedUnion(
  'intent',
  INTENT_NAMES.map((name) =>
    z.object({
      intent: z.literal(name),
      spokenReply: z.string().min(1).max(400),
      data: INTENTS[name],
    }),
  ),
)

// Every task ID mentioned anywhere in a reply, so we can check they're all real
function referencedTaskIds({ intent, data }) {
  switch (intent) {
    case 'BRIEFING': return data.focusTaskId == null ? [] : [data.focusTaskId]
    case 'PRIORITISE': return data.ranking.map((r) => r.taskId)
    case 'FOCUS_NOW': return data.taskId == null ? [] : [data.taskId]
    case 'PLAN': return data.days.flatMap((d) => d.blocks.map((b) => b.taskId))
    case 'WORKLOAD': return data.items.map((i) => i.taskId)
    case 'LOOKUP': return data.taskIds
    case 'BREAKDOWN': return [data.taskId]
    case 'UNCLEAR': return data.optionTaskIds
    default: return []
  }
}

module.exports = { INTENT_NAMES, replySchema, referencedTaskIds }
