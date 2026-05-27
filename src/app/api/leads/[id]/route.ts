import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/google-calendar'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await request.json()
  const { flavors, quote, ...leadData } = body

  // שמור את המצב לפני העדכון
  const currentLead = await db.lead.findUnique({
    where: { id },
    include: { location: true },
  })

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

  // סנכרון Google Calendar
  if (currentLead) {
    const newStatus = leadData.status ?? currentLead.status
    const newDate = leadData.eventDate ?? currentLead.eventDate
    const newStartTime = leadData.startTime ?? currentLead.startTime
    const newEndTime = leadData.endTime ?? currentLead.endTime
    const newNotes = leadData.notes !== undefined ? leadData.notes : currentLead.notes
    const newLocationId = leadData.locationId ?? currentLead.locationId

    // קבל שם עיר מעודכן אם מיקום השתנה
    let cityName = currentLead.location?.cityName ?? ''
    if (newLocationId && newLocationId !== currentLead.locationId) {
      const loc = await db.location.findUnique({ where: { id: newLocationId } })
      cityName = loc?.cityName ?? ''
    }

    const wasClosedBefore = currentLead.status === 'closed'
    const isClosedNow = newStatus === 'closed'

    if (!wasClosedBefore && isClosedNow) {
      // סטטוס השתנה ל"סגור" → צור אירוע בלוח
      const googleEventId = await createCalendarEvent({
        clientName: currentLead.clientName,
        cityName,
        eventDate: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        notes: newNotes,
      })
      if (googleEventId) {
        await db.lead.update({ where: { id }, data: { googleEventId } })
      }
    } else if (wasClosedBefore && !isClosedNow && currentLead.googleEventId) {
      // סטטוס עבר מ"סגור" → מחק מהלוח
      await deleteCalendarEvent(currentLead.googleEventId)
      await db.lead.update({ where: { id }, data: { googleEventId: null } })
    } else if (isClosedNow && currentLead.googleEventId) {
      // עדיין סגור — עדכן אם תאריך/שעה/מיקום/הערות השתנו
      const changed =
        (leadData.eventDate && leadData.eventDate !== currentLead.eventDate) ||
        (leadData.startTime && leadData.startTime !== currentLead.startTime) ||
        (leadData.endTime && leadData.endTime !== currentLead.endTime) ||
        (leadData.locationId && leadData.locationId !== currentLead.locationId) ||
        (leadData.notes !== undefined && leadData.notes !== currentLead.notes)

      if (changed) {
        await updateCalendarEvent(currentLead.googleEventId, {
          clientName: currentLead.clientName,
          cityName,
          eventDate: newDate,
          startTime: newStartTime,
          endTime: newEndTime,
          notes: newNotes,
        })
      }
    }
  }

  return NextResponse.json({ ok: true })
}
