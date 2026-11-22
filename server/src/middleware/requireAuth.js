const jwt = require('jsonwebtoken')

// Lets a request through only if it carries a valid login token
// in the header "Authorization: Bearer <token>"
function requireAuth(req, res, next) {
  const header = req.headers.authorization || ''
  const [scheme, token] = header.split(' ')

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Please log in' })
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET)
    req.userId = payload.userId
    next()
  } catch {
    return res.status(401).json({ error: 'Your session is invalid or has expired, please log in again' })
  }
}

module.exports = requireAuth
