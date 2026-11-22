// Vercel runs this file as a serverless function for every /api/... request.
// It is the same Express app that runs on the laptop (server/src/app.js).
module.exports = require('../server/src/app')
