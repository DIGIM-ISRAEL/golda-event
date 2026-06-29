import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { basketasRequiredFor, type EventLog } from '@/lib/event-cost'

// ולידציה של מפת בסקטות (flavorId → מספר אי-שלילי שלם)
function cleanBasketaMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v)
    if (Number.isFinite(n) && n >= 0) out[k] = Math.floor(n)
  }
  return out
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()

  const data: { checkedItems?: string[]; eventLog?: Prisma.InputJsonValue } = {}

  if (body.checkedItems !== undefined) {
    if (!Array.isArray(body.checkedItems)) {
      return NextResponse.json({ error: 'Invalid checkedItems' }, { status: 400 })
    }
    data.checkedItems = body.checkedItems
  }

  // יומן האירוע — בסקטות שיצאו/חזרו. כל אחד מאומת מול הטעמים והבסקטות הנדרשות.
  if (body.eventLog !== undefined) {
    const lead = await db.lead.findUnique({
      where: { id },
      select: { participants: true, flavors: { select: { flavorId: true } } },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const validIds = new Set(lead.flavors.map((lf) => lf.flavorId))
    const basketasRequired = basketasRequiredFor(lead.participants)

    const rawOut = cleanBasketaMap(body.eventLog?.basketasOut)
    const rawReturned = cleanBasketaMap(body.eventLog?.basketasReturned)

    // השאר רק טעמים ששייכים לליד
    const basketasOut: Record<string, number> = {}
    const basketasReturned: Record<string, number> = {}
    for (const fid of validIds) {
      if (rawOut[fid] !== undefined) basketasOut[fid] = Math.min(rawOut[fid], basketasRequired)
      if (rawReturned[fid] !== undefined) {
        // אי אפשר להחזיר יותר ממה שיצא (אם לא הוגדר "יצא" — תקרה = כל הנדרש)
        const cap = basketasOut[fid] ?? rawOut[fid] ?? basketasRequired
        basketasReturned[fid] = Math.min(rawReturned[fid], cap)
      }
    }

    const eventLog: EventLog = {}
    if (Object.keys(basketasOut).length > 0) eventLog.basketasOut = basketasOut
    if (Object.keys(basketasReturned).length > 0) {
      eventLog.basketasReturned = basketasReturned
      eventLog.returnedAt = new Date().toISOString()
    }
    data.eventLog = eventLog as unknown as Prisma.InputJsonValue
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })
  }

  await db.lead.update({ where: { id }, data })

  return NextResponse.json({ ok: true })
}
