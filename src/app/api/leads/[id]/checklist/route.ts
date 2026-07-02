import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { sanitizeEventLog, type EventLog } from '@/lib/event-cost'
import { finalizeEventAndReport } from '@/lib/cost-report'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const lead = await db.lead.findUnique({
    where: { id },
    select: {
      status: true,
      participants: true,
      eventLog: true,
      flavors: { select: { flavorId: true } },
    },
  })
  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

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
    await db.lead.update({ where: { id }, data })
  }

  // סיום אירוע ושליחת דוח עלויות — רק כשהאירוע בסטטוס "סגור"
  if (body.finalize === true) {
    if (lead.status !== 'closed') {
      return NextResponse.json({ error: 'האירוע אינו בסטטוס סגור' }, { status: 409 })
    }
    const res = await finalizeEventAndReport(id)
    return NextResponse.json({ ok: true, movedToDone: res.movedToDone, alreadySent: res.alreadySent ?? false })
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  return NextResponse.json({ ok: true })
}
