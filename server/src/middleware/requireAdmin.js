const prisma = require('../db')
const requireAuth = require('./requireAuth')

// Lets a request through only for a logged-in ADMIN.
// The role is read fresh from the database each time, so removing admin takes effect at once.
async function checkAdmin(req, res, next) {
  const user = await prisma.user.findUnique({ where: { id: req.userId }, select: { role: true } })
  if (user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admins only' })
  }
  next()
}

module.exports = [requireAuth, checkAdmin]
