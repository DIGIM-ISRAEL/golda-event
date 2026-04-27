import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAirtableLeads, getAllAirtableLeads } from '@/lib/airtable'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.AIRTABLE_API_KEY) {
    return NextResponse.json({ error: 'AIRTABLE_API_KEY לא מוגדר בשרת' }, { status: 500 })
  }

  try {
    if (session.role === 'admin') {
      const leads = await getAllAirtableLeads()
      return NextResponse.json(leads)
    }

    if (!session.phoneNumber) {
      return NextResponse.json(
        { error: 'לא הוגדר מספר טלפון לפרופיל שלך. בקש ממנהל להגדיר אותו.' },
        { status: 400 }
      )
    }

    const leads = await getAirtableLeads(session.phoneNumber)
    return NextResponse.json(leads)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאה'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
