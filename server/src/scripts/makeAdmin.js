// Turns an existing Molade account into an admin (or back into a student).
//   npm run make-admin -- someone@example.com
//   npm run make-admin -- someone@example.com --remove
require('dotenv').config()
const prisma = require('../db')

async function main() {
  const email = (process.argv[2] || '').trim().toLowerCase()
  const remove = process.argv.includes('--remove')

  if (!email || email.startsWith('--')) {
    console.log('Usage: npm run make-admin -- someone@example.com [--remove]')
    process.exitCode = 1
    return
  }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) {
    console.log(`No Molade account uses ${email}. Sign up with it first, then run this again.`)
    process.exitCode = 1
    return
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: remove ? 'STUDENT' : 'ADMIN' } })
  console.log(remove ? `${user.name} (${email}) is now a student.` : `${user.name} (${email}) is now an admin. Log out and back in to see Admin.`)
}

main()
  .catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
