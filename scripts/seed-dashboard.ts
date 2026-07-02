// סיד בדיקה לדשבורד הרווחיות — 4 אירועים על פני 3 חודשים (אידמפוטנטי)
import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()

async function upsertLead(params: {
  name: string; phone: string; date: string; status: string
  participants: number; total: number; flavorIds: string[]
  locationId: string; eventLog?: object | null; costReportSentAt?: Date | null
  checklistToken?: string | null
}) {
  const existing = await db.lead.findFirst({ where: { clientName: params.name } })
  const base = {
    clientPhone: params.phone,
    clientType: 'institutional' as const,
    eventType: 'dairy' as const,
    eventDate: params.date,
    startTime: '14:00',
    endTime: '17:00',
    locationId: params.locationId,
    participants: params.participants,
    status: params.status as never,
    managerIncluded: true,
    assistantsCount: 1,
    eventLog: (params.eventLog ?? undefined) as never,
    costReportSentAt: params.costReportSentAt ?? null,
    checklistToken: params.checklistToken === undefined ? null : params.checklistToken,
  }
  const lead = existing
    ? await db.lead.update({ where: { id: existing.id }, data: base })
    : await db.lead.create({ data: { clientName: params.name, ...base } })

  await db.leadFlavor.deleteMany({ where: { leadId: lead.id } })
  await db.leadFlavor.createMany({ data: params.flavorIds.map((f) => ({ leadId: lead.id, flavorId: f })) })
  await db.quote.upsert({
    where: { leadId: lead.id },
    update: { totalPrice: params.total, balanceDue: params.total },
    create: {
      leadId: lead.id, basePrice: params.total, logisticsCost: 250,
      vatAmount: Math.round(params.total * 0.18 * 100) / 100,
      totalPrice: params.total, advancePaid: 0, balanceDue: params.total,
    },
  })
  return lead
}

async function main() {
  // טעמים עם עלות אמיתית
  const flavorDefs = [
    { name: 'פיסטוק', category: 'dairy', costPerBasketa: 177.8 },
    { name: 'שוקולד בלגי', category: 'dairy', costPerBasketa: 140.5 },
    { name: 'וניל מדגסקר', category: 'dairy', costPerBasketa: 121.9 },
    { name: 'מנגו', category: 'parve', costPerBasketa: 98.4 },
  ]
  const flavors: { id: string }[] = []
  for (const f of flavorDefs) {
    const ex = await db.flavor.findFirst({ where: { name: f.name } })
    flavors.push(
      ex
        ? await db.flavor.update({ where: { id: ex.id }, data: { costPerBasketa: f.costPerBasketa, isInStock: true } })
        : await db.flavor.create({ data: f as never }),
    )
  }
  const fids = flavors.map((f) => f.id)

  let loc = await db.location.findFirst({ where: { cityName: 'הרצליה' } })
  loc ??= await db.location.create({ data: { cityName: 'הרצליה', travelCostNis: 250 } })

  // 1. אירוע סגור החודש, עם החזרות שנשקלו — checklistToken=null לבדיקת יצירה עצלנית
  await upsertLead({
    name: 'חברת אלביט מערכות', phone: '0521234567', date: '2026-07-15', status: 'closed',
    participants: 150, total: 9500, flavorIds: fids.slice(0, 3), locationId: loc.id,
    eventLog: {
      basketasOut: { [fids[0]]: 5, [fids[1]]: 4, [fids[2]]: 4 },
      returnedKg: { [fids[0]]: 2.5, [fids[1]]: 1.2 },
      returnedAt: new Date().toISOString(),
    },
    costReportSentAt: null, checklistToken: null,
  })

  // 2. הצעה פתוחה החודש (צנרת)
  await upsertLead({
    name: 'עיריית רעננה', phone: '0529876543', date: '2026-07-22', status: 'quote_sent',
    participants: 90, total: 6200, flavorIds: fids.slice(1, 4), locationId: loc.id,
  })

  // 3. אירוע שבוצע החודש — רווח נמוך (לבדוק אזהרה בטבלה)
  await upsertLead({
    name: 'גן אירועים השרון', phone: '0501112222', date: '2026-07-03', status: 'done',
    participants: 200, total: 5800, flavorIds: fids, locationId: loc.id,
    eventLog: { basketasOut: { [fids[0]]: 5, [fids[1]]: 5, [fids[2]]: 4, [fids[3]]: 3 } },
    costReportSentAt: new Date(), checklistToken: 'done-event-token-1',
  })

  // 4. אירוע שבוצע ביוני (מגמה)
  await upsertLead({
    name: 'אינטל קריית גת', phone: '0503334444', date: '2026-06-18', status: 'done',
    participants: 120, total: 8400, flavorIds: fids.slice(0, 3), locationId: loc.id,
    eventLog: {
      basketasOut: { [fids[0]]: 4, [fids[1]]: 4, [fids[2]]: 2 },
      returnedKg: { [fids[2]]: 3.0 },
      returnedAt: new Date('2026-06-19').toISOString(),
    },
    costReportSentAt: new Date('2026-06-19'), checklistToken: 'done-event-token-2',
  })

  // 5. אירוע שבוצע במאי (מגמה)
  await upsertLead({
    name: 'משרד עו"ד גולן ושות', phone: '0505556666', date: '2026-05-12', status: 'done',
    participants: 60, total: 4300, flavorIds: fids.slice(0, 2), locationId: loc.id,
    eventLog: { basketasOut: { [fids[0]]: 3, [fids[1]]: 2 } },
    costReportSentAt: new Date('2026-05-13'), checklistToken: 'done-event-token-3',
  })

  console.log('seeded ✓')
}
main().finally(() => db.$disconnect())
