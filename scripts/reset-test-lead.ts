// איפוס ליד הבדיקה לתרחיש "הצעה נשלחה לפני 3 ימים, טרם נצפתה/נחתמה" + הגדרות מקדמה
import { PrismaClient } from '@prisma/client'

const db = new PrismaClient()

async function main() {
  const lead = await db.lead.findFirst({ where: { clientName: 'חברת אלביט מערכות' } })
  if (!lead) throw new Error('test lead not found — run seed-test.ts first')

  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)
  await db.lead.update({
    where: { id: lead.id },
    data: {
      status: 'quote_sent',
      clientApprovedAt: null,
      clientApprovedName: null,
      clientApprovedIp: null,
      clientSignature: null,
      quoteViewedAt: null,
      quoteSentAt: threeDaysAgo,
      followupStage: 0,
      googleEventId: null,
    },
  })

  await db.settings.upsert({ where: { key: 'deposit_percent' }, update: { value: '30' }, create: { key: 'deposit_percent', value: '30' } })
  await db.settings.upsert({
    where: { key: 'deposit_instructions' },
    update: { value: 'ביט או פייבוקס למספר 050-1112222 (גולדה אירועים)' },
    create: { key: 'deposit_instructions', value: 'ביט או פייבוקס למספר 050-1112222 (גולדה אירועים)' },
  })

  console.log('reset done. token:', lead.signatureToken, 'leadId:', lead.id)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => db.$disconnect())
