import { db } from '@/lib/db'
import {
  createCalendarEvent,
  updateCalendarEvent,
  deleteCalendarEvent,
} from '@/lib/google-calendar'

// מרכז את כל לוגיקת הסנכרון מול Google Calendar.
// קורא את המצב הנוכחי של הליד (אחרי עדכון) ומיישב את היומן בהתאם:
//  - סטטוס "סגור" ואין אירוע ביומן  → יוצר אירוע ושומר googleEventId
//  - סטטוס "סגור" ויש אירוע ביומן   → מעדכן את האירוע (תאריך/שעה/מקום)
//  - סטטוס אחר ויש אירוע ביומן       → מוחק את האירוע ומנקה googleEventId
//
// בטוח לקריאה מכל route (POST/PATCH/status) — מטפל בשגיאות בעצמו.
export async function syncLeadCalendar(leadId: string): Promise<void> {
  const lead = await db.lead.findUnique({
    where: { id: leadId },
    include: { location: true, flavors: { include: { flavor: true } } },
  })
  if (!lead) return

  const isClosed = lead.status === 'closed'
  const hasEvent = !!lead.googleEventId
  const hasDateTime = !!(lead.eventDate && lead.startTime && lead.endTime)

  const eventParams = {
    clientName: lead.clientName,
    clientPhone: lead.clientPhone,
    cityName: lead.location?.cityName ?? '',
    eventDate: lead.eventDate,
    startTime: lead.startTime,
    endTime: lead.endTime,
    participants: lead.participants,
    flavors: lead.flavors.map((lf) => lf.flavor.name),
    notes: lead.notes,
  }

  // צור אירוע חדש
  if (isClosed && !hasEvent && hasDateTime) {
    const googleEventId = await createCalendarEvent(eventParams)
    if (googleEventId) {
      await db.lead.update({ where: { id: leadId }, data: { googleEventId } })
    }
    return
  }

  // עדכן אירוע קיים
  if (isClosed && hasEvent && hasDateTime) {
    await updateCalendarEvent(lead.googleEventId!, eventParams)
    return
  }

  // מחק אירוע (כבר לא סגור)
  if (!isClosed && hasEvent) {
    await deleteCalendarEvent(lead.googleEventId!)
    await db.lead.update({ where: { id: leadId }, data: { googleEventId: null } })
    return
  }
}
