import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { syncLeadCalendar } from '@/lib/calendar-sync'
import { findClosedConflict } from '@/lib/conflicts'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { flavors, quote, ...leadData } = body

  const existing = await db.lead.findUnique({ where: { id } })
  if (!existing) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  // עגלה אחת בלבד — אם הליד (אחרי העדכון) סגור, אסור שיחפוף אירוע סגור אחר
  const effectiveStatus = leadData.status ?? existing.status
  if (effectiveStatus === 'closed') {
    const conflict = await findClosedConflict({
      eventDate: leadData.eventDate ?? existing.eventDate,
      startTime: leadData.startTime ?? existing.startTime,
      endTime: leadData.endTime ?? existing.endTime,
      excludeLeadId: id,
    })
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 })
  }

  await db.lead.update({ where: { id }, data: leadData })

  if (flavors !== undefined) {
    await db.leadFlavor.deleteMany({ where: { leadId: id } })
    if (flavors.length > 0) {
      await db.leadFlavor.createMany({
        data: flavors.map((fid: string) => ({ leadId: id, flavorId: fid })),
      })
    }
  }

  if (quote !== undefined) {
    await db.quote.upsert({
      where: { leadId: id },
      update: quote,
      create: { ...quote, leadId: id },
    })
  }

  // סנכרון Google Calendar (יוצר/מעדכן/מוחק אירוע לפי הסטטוס והפרטים)
  await syncLeadCalendar(id)

  return NextResponse.json({ ok: true })
}
