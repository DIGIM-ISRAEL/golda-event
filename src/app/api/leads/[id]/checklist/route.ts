import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import {
  basketasRequiredFor,
  defaultBasketaSplit,
  KG_PER_BASKETA,
  type EventLog,
} from '@/lib/event-cost'

// מפת מספרים שלמים אי-שליליים (בסקטות)
function cleanIntMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v)
    if (Number.isFinite(n) && n >= 0) out[k] = Math.floor(n)
  }
  return out
}

// מפת מספרים עשרוניים אי-שליליים (ק"ג)
function cleanFloatMap(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== 'object') return {}
  const out: Record<string, number> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    const n = Number(v)
    if (Number.isFinite(n) && n >= 0) out[k] = Math.round(n * 100) / 100
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

  // יומן האירוע — בסקטות שיצאו (שלם) + משקל שחזר (ק"ג). מאומת מול הטעמים.
  if (body.eventLog !== undefined) {
    const lead = await db.lead.findUnique({
      where: { id },
      select: { participants: true, flavors: { select: { flavorId: true } } },
    })
    if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

    const ids = lead.flavors.map((lf) => lf.flavorId)
    const validIds = new Set(ids)
    const basketasRequired = basketasRequiredFor(lead.participants)
    const defaultOut = defaultBasketaSplit(ids, basketasRequired)

    const rawOut = cleanIntMap(body.eventLog?.basketasOut)
    const rawReturnedKg = cleanFloatMap(body.eventLog?.returnedKg)

    const basketasOut: Record<string, number> = {}
    const returnedKg: Record<string, number> = {}
    for (const fid of validIds) {
      if (rawOut[fid] !== undefined) basketasOut[fid] = Math.min(rawOut[fid], basketasRequired)
      if (rawReturnedKg[fid] !== undefined) {
        // אי אפשר להחזיר יותר ממה שיצא במשקל
        const outBaskets = basketasOut[fid] ?? rawOut[fid] ?? defaultOut[fid] ?? 0
        const outKg = outBaskets * KG_PER_BASKETA
        returnedKg[fid] = Math.min(rawReturnedKg[fid], outKg)
      }
    }

    const eventLog: EventLog = {}
    if (Object.keys(basketasOut).length > 0) eventLog.basketasOut = basketasOut
    if (Object.keys(returnedKg).length > 0) {
      eventLog.returnedKg = returnedKg
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
