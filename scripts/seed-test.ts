// זריעת נתוני בדיקה ל-DB מקומי — להרצה: npx tsx scripts/seed-test.ts
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  // אדמין לבדיקות
  const passwordHash = await bcrypt.hash('test1234', 12)
  const admin = await db.user.upsert({
    where: { email: 'admin@test.local' },
    update: {},
    create: {
      email: 'admin@test.local',
      passwordHash,
      fullName: 'רון (בדיקות)',
      role: 'admin',
      phoneNumber: '0501112222',
    },
  })

  // הגדרות
  await db.settings.upsert({ where: { key: 'basketa_cost_nis' }, update: {}, create: { key: 'basketa_cost_nis', value: '150' } })
  await db.settings.upsert({ where: { key: 'profit_warning_threshold' }, update: {}, create: { key: 'profit_warning_threshold', value: '1000' } })

  // טעמים
  const flavorNames: { name: string; category: 'dairy' | 'parve' }[] = [
    { name: 'וניל', category: 'dairy' },
    { name: 'שוקולד', category: 'dairy' },
    { name: 'פיסטוק', category: 'dairy' },
    { name: 'קרמל מלוח', category: 'dairy' },
    { name: 'תות', category: 'parve' },
    { name: 'מנגו', category: 'parve' },
  ]
  const flavors = []
  for (const f of flavorNames) {
    const existing = await db.flavor.findFirst({ where: { name: f.name } })
    flavors.push(existing ?? (await db.flavor.create({ data: f })))
  }

  // מיקום
  let location = await db.location.findFirst({ where: { cityName: 'הרצליה' } })
  location ??= await db.location.create({ data: { cityName: 'הרצליה', travelCostNis: 250 } })

  // ליד לדוגמה עם הצעה
  let lead = await db.lead.findFirst({ where: { clientName: 'חברת אלביט מערכות' } })
  if (!lead) {
    lead = await db.lead.create({
      data: {
        clientName: 'חברת אלביט מערכות',
        clientPhone: '050-1234567',
        clientType: 'institutional',
        eventType: 'dairy',
        eventDate: '2026-07-15',
        startTime: '18:00',
        endTime: '20:00',
        locationId: location.id,
        participants: 200,
        status: 'quote_sent',
        salesRepId: admin.id,
        notes: 'אירוע חברה שנתי. דרושה הקמה שעה מראש.',
        flavors: { create: flavors.map((f) => ({ flavorId: f.id })) },
        quote: {
          create: {
            basePrice: 6550,
            vatAmount: 1224,
            logisticsCost: 250,
            extras: [],
            discountValue: 0,
            advancePaid: 2000,
            balanceDue: 6024,
            totalPrice: 8024,
          },
        },
      },
    })
  }

  console.log('Seeded:')
  console.log('  admin: admin@test.local / test1234')
  console.log('  lead id:', lead.id)
  console.log('  signature token:', lead.signatureToken)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
