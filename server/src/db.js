const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

// One shared Prisma client for the whole app
// Neon closes idle connections (and the laptop's internet can drop), so don't keep idle
// connections around long; stale ones are replaced with fresh ones on the next request.
// sslmode=verify-full is what "require" already means in pg today; saying it explicitly
// silences pg's warning about the meaning changing in a future version.
const adapter = new PrismaPg({
  connectionString: (process.env.DATABASE_URL || '').replace('sslmode=require', 'sslmode=verify-full'),
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000,
})
const prisma = new PrismaClient({ adapter })

module.exports = prisma
