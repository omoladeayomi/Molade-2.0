const crypto = require('crypto')

// One-time tokens for email links (verify email, reset password).
// The email gets the random token; the database only stores its SHA-256 hash.

function createToken() {
  const token = crypto.randomBytes(32).toString('hex')
  return { token, hash: hashToken(token) }
}

function hashToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

function appLink(path, token) {
  const base = process.env.APP_URL || 'http://localhost:5173'
  return `${base}${path}?token=${token}`
}

module.exports = { createToken, hashToken, appLink }
