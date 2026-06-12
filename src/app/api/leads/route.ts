import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { syncLeadCalendar } from '@/lib/calendar-sync'
import { findClosedConflict } from '@/lib/conflicts'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { flavors, quote, ...leadData } = body

  // עגלה אחת בלבד — יצירת ליד ישירות כ"סגור" חייבת לעבור בדיקת חפיפה
  if (leadData.status === 'closed') {
    const conflict = await findClosedConflict({
      eventDate: leadData.eventDate,
      startTime: leadData.startTime,
      endTime: leadData.endTime,
    })
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 })
  }

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
  })

  // סנכרון Google Calendar (יוצר אירוע אם הסטטוס "סגור")
  await syncLeadCalendar(lead.id)

  return NextResponse.json(lead)
}
