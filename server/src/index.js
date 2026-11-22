// Runs Molade's API on the laptop (npm run dev). On Vercel, api/index.js is used instead.
const app = require('./app')
const { scheduleReminders } = require('./jobs/reminders')

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`)
  scheduleReminders()
})
