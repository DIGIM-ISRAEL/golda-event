import { PrismaClient } from '@prisma/client'
const db = new PrismaClient()
async function main() {
  const l = await db.lead.findFirst({ where: { clientName: 'חברת אלביט מערכות' }, select: { id: true, status: true, signatureToken: true, checklistToken: true, eventLog: true, costReportSentAt: true } })
  console.log(JSON.stringify(l, null, 1))
}
main().finally(() => db.$disconnect())
