import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const ADMIN_EMAIL = process.env.ADMIN_EMAIL
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'רון'

if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('Missing required environment variables: ADMIN_EMAIL, ADMIN_PASSWORD')
  process.exit(1)
}

const db = new PrismaClient()

const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12)

const user = await db.user.upsert({
  where: { email: ADMIN_EMAIL.toLowerCase() },
  update: { passwordHash, fullName: ADMIN_NAME, role: 'admin' },
  create: { email: ADMIN_EMAIL.toLowerCase(), passwordHash, fullName: ADMIN_NAME, role: 'admin' },
})

console.log('✅ Admin user created/updated:', user.email)
await db.$disconnect()
