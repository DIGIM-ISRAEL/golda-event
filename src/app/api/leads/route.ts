import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { createCalendarEvent } from '@/lib/google-calendar'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { flavors, quote, ...leadData } = body

  const lead = await db.lead.create({
    data: {
      ...leadData,
      salesRepId: session.userId,
      flavors: flavors?.length
        ? { create: flavors.map((fid: string) => ({ flavorId: fid })) }
        : undefined,
      quote: quote
        ? { create: quote }
        : undefined,
    },
    include: { location: true },
  })

  // סנכרון Google Calendar כשהסטטוס "סגור / שמור"
  if (lead.status === 'closed' && lead.eventDate && lead.startTime && lead.endTime) {
    const cityName = lead.location?.cityName ?? ''
    const googleEventId = await createCalendarEvent({
      clientName: lead.clientName,
      cityName,
      eventDate: lead.eventDate,
      startTime: lead.startTime,
      endTime: lead.endTime,
      notes: lead.notes,
    })
    if (googleEventId) {
      await db.lead.update({ where: { id: lead.id }, data: { googleEventId } })
    }
  }

  return NextResponse.json(lead)
}
