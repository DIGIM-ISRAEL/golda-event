import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { sanitizeEventLog, type EventLog } from '@/lib/event-cost'
import { finalizeEventAndReport } from '@/lib/cost-report'

// עדכון צ'קליסט דרך לינק ציבורי (טוקן) — לעובד שאינו מחובר.
// תצוגת עובד בלבד: צ'קליסט הכנה + החזרות במשקל. בלי עלויות.
// חשוב: טוקן צ'קליסט ייעודי (checklistToken) — לא טוקן האישור שנמצא אצל הלקוח.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const body = await request.json()

  const lead = await db.lead.findUnique({
    where: { checklistToken: token },
    select: {
      id: true,
      status: true,
      participants: true,
      eventLog: true,
      flavors: { select: { flavorId: true } },
    },
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
      existing: (lead.eventLog as EventLog | null) ?? null,
    })
    data.eventLog = eventLog as unknown as Prisma.InputJsonValue
  }

  if (Object.keys(data).length > 0) {
    await db.lead.update({ where: { id: lead.id }, data })
  }

  if (body.finalize === true) {
    // סיום מהלינק הציבורי — רק לאירוע בסטטוס "סגור" (מונע דוחות מוקדמים/כפולים)
    if (lead.status !== 'closed') {
      return NextResponse.json({ error: 'האירוע אינו בסטטוס סגור' }, { status: 409 })
    }
    const res = await finalizeEventAndReport(lead.id)
    return NextResponse.json({ ok: true, movedToDone: res.movedToDone, alreadySent: res.alreadySent ?? false })
  }

  return NextResponse.json({ ok: true })
}
