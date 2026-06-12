import { google } from 'googleapis'

const CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID ?? 'primary'
const TZ = 'Asia/Jerusalem'

export interface CalendarEventParams {
  clientName: string
  clientPhone?: string | null
  cityName: string
  eventDate: string // 'YYYY-MM-DD'
  startTime: string // 'HH:MM'
  endTime: string // 'HH:MM'
  participants?: number | null
  flavors?: string[]
  notes?: string | null
}

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

// גוף האירוע ביומן — כולל כל מה שצוות השטח צריך: טלפון, Waze, משתתפים וטעמים
function buildRequestBody(params: CalendarEventParams) {
  const descriptionParts: string[] = []
  if (params.clientPhone) descriptionParts.push(`📞 טלפון: ${params.clientPhone}`)
  if (params.participants) descriptionParts.push(`👥 משתתפים: ${params.participants}`)
  if (params.cityName)
    descriptionParts.push(`🗺️ Waze: https://waze.com/ul?q=${encodeURIComponent(params.cityName)}`)
  if (params.flavors && params.flavors.length > 0)
    descriptionParts.push(`🍦 טעמים: ${params.flavors.join(' · ')}`)
  if (params.notes) descriptionParts.push(`📝 הערות: ${params.notes}`)

  return {
    summary: `אירוע גולדה - ${params.clientName}, ${params.cityName}`,
    location: params.cityName || undefined,
    description: descriptionParts.join('\n'),
    start: {
      dateTime: `${params.eventDate}T${params.startTime}:00`,
      timeZone: TZ,
    },
    end: {
      dateTime: `${params.eventDate}T${params.endTime}:00`,
      timeZone: TZ,
    },
  }
}

export async function createCalendarEvent(params: CalendarEventParams): Promise<string | null> {
  const cal = getClient()
  if (!cal) return null

  try {
    const res = await cal.events.insert({
      calendarId: CALENDAR_ID,
      requestBody: buildRequestBody(params),
    })
    return res.data.id ?? null
  } catch (err) {
    console.error('Google Calendar create failed:', err)
    return null
  }
}

export async function updateCalendarEvent(
  eventId: string,
  params: CalendarEventParams,
): Promise<void> {
  const cal = getClient()
  if (!cal) return

  try {
    await cal.events.update({
      calendarId: CALENDAR_ID,
      eventId,
      requestBody: buildRequestBody(params),
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
