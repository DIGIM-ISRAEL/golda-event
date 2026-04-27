import { NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAirtableLeads, getAirtableLeadsByPhones } from '@/lib/airtable'
import { db } from '@/lib/db'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!process.env.AIRTABLE_API_KEY) {
    return NextResponse.json({ error: 'AIRTABLE_API_KEY לא מוגדר בשרת' }, { status: 500 })
  }

  try {
    if (session.role === 'admin') {
      // Fetch leads for all employees who have a phone number set
      const users = await db.user.findMany({
        where: { phoneNumber: { not: null } },
        select: { phoneNumber: true },
      })
      const phones = users.map((u) => u.phoneNumber!)
      const leads = await getAirtableLeadsByPhones(phones)
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
