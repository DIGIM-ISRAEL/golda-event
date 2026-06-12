import { db } from '@/lib/db'
import { timesOverlap, formatTime } from '@/lib/utils'

// בדיקת ההתנגשות הקשה — לעסק יש עגלת גלידה אחת בלבד,
// לכן אסור ששני אירועים "סגורים" יחפפו בשעות באותו יום.
// מחזיר הודעת שגיאה בעברית אם קיימת התנגשות, אחרת null.
export async function findClosedConflict(params: {
  eventDate: string
  startTime: string
  endTime: string
  excludeLeadId?: string
}): Promise<string | null> {
  const { eventDate, startTime, endTime, excludeLeadId } = params
  if (!eventDate || !startTime || !endTime) return null

  const sameDayClosed = await db.lead.findMany({
    where: {
      eventDate,
      status: 'closed',
      ...(excludeLeadId ? { id: { not: excludeLeadId } } : {}),
    },
    include: { location: true },
  })

  for (const other of sameDayClosed) {
    if (timesOverlap(startTime, endTime, other.startTime, other.endTime)) {
      return `קיים אירוע חופף! ${other.clientName} — ${other.location?.cityName ?? ''} ${formatTime(other.startTime)}–${formatTime(other.endTime)}`
    }
  }

  return null
}
