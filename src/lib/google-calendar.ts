import { google } from 'googleapis'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? 'primary'
const TZ = 'Asia/Jerusalem'

function getClient() {
  if (
    !process.env.GOOGLE_CLIENT_ID ||
    !process.env.GOOGLE_CLIENT_SECRET ||
    !process.env.GOOGLE_REFRESH_TOKEN
  ) {
    return null
  }
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  )
  auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
  return google.calendar({ version: 'v3', auth })
}

export async function createCalendarEvent(params: {
  clientName: string
  cityName: string
  eventDate: string  // 'YYYY-MM-DD'
  startTime: string  // 'HH:MM'
  endTime: string    // 'HH:MM'
  notes?: string | null
}): Promise<string | null> {
  const cal = getClient()
  if (!cal) return null

  try {
    const res = await cal.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: {
        summary: `אירוע גולדה - ${params.clientName}, ${params.cityName}`,
        description: params.notes ?? '',
        start: {
          dateTime: `${params.eventDate}T${params.startTime}:00`,
          timeZone: TZ,
        },
        end: {
          dateTime: `${params.eventDate}T${params.endTime}:00`,
          timeZone: TZ,
        },
      },
    })
    return res.data.id ?? null
  } catch (err) {
    console.error('Google Calendar create failed:', err)
    return null
  }
}

export async function updateCalendarEvent(
  eventId: string,
  params: {
    clientName: string
    cityName: string
    eventDate: string
    startTime: string
    endTime: string
    notes?: string | null
  },
): Promise<void> {
  const cal = getClient()
  if (!cal) return

  try {
    await cal.events.update({
      calendarId: CALENDAR_ID,
      eventId,
      requestBody: {
        summary: `אירוע גולדה - ${params.clientName}, ${params.cityName}`,
        description: params.notes ?? '',
        start: {
          dateTime: `${params.eventDate}T${params.startTime}:00`,
          timeZone: TZ,
        },
        end: {
          dateTime: `${params.eventDate}T${params.endTime}:00`,
          timeZone: TZ,
        },
      },
    })
  } catch (err) {
    console.error('Google Calendar update failed:', err)
  }
}

export async function deleteCalendarEvent(eventId: string): Promise<void> {
  const cal = getClient()
  if (!cal) return

  try {
    await cal.events.delete({ calendarId: CALENDAR_ID, eventId })
  } catch (err) {
    console.error('Google Calendar delete failed:', err)
  }
}
