import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { sanitizeEventLog } from '@/lib/event-cost'
import { finalizeEventAndReport } from '@/lib/cost-report'

// עדכון צ'קליסט דרך לינק ציבורי (טוקן) — לעובד שאינו מחובר.
// תצוגת עובד בלבד: צ'קליסט הכנה + החזרות במשקל. בלי עלויות.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const body = await request.json()

  const lead = await db.lead.findUnique({
    where: { signatureToken: token },
    select: { id: true, participants: true, flavors: { select: { flavorId: true } } },
  })
  if (!lead) return NextResponse.json({ error: 'קישור לא תקף' }, { status: 404 })

  const data: {
    checkedItems?: string[]
    customChecklistItems?: string[]
    eventLog?: Prisma.InputJsonValue
  } = {}

  if (Array.isArray(body.checkedItems)) data.checkedItems = body.checkedItems
  if (Array.isArray(body.customChecklistItems)) {
    data.customChecklistItems = body.customChecklistItems.map((s: unknown) => String(s)).filter(Boolean)
  }
  if (body.eventLog !== undefined) {
    const eventLog = sanitizeEventLog({
      flavorIds: lead.flavors.map((lf) => lf.flavorId),
      participants: lead.participants,
      basketasOut: body.eventLog?.basketasOut,
      returnedKg: body.eventLog?.returnedKg,
    })
    data.eventLog = eventLog as unknown as Prisma.InputJsonValue
  }

  if (Object.keys(data).length > 0) {
    await db.lead.update({ where: { id: lead.id }, data })
  }

  if (body.finalize === true) {
    const res = await finalizeEventAndReport(lead.id)
    return NextResponse.json({ ok: true, movedToDone: res.movedToDone })
  }

  return NextResponse.json({ ok: true })
}
