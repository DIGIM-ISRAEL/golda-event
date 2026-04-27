import Link from 'next/link'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { syncAirtableLeadsToDb } from '@/lib/airtable'
import KanbanBoard from '@/components/leads/KanbanBoard'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  // Sync Airtable leads into DB (non-blocking — errors are silently ignored)
  if (process.env.AIRTABLE_API_KEY) {
    try {
      const session = await getSession()
      if (session) {
        let phones: string[] = []
        if (session.role === 'admin') {
          const users = await db.user.findMany({
            where: { phoneNumber: { not: null } },
            select: { phoneNumber: true },
          })
          phones = users.map((u) => u.phoneNumber!)
        } else if (session.phoneNumber) {
          phones = [session.phoneNumber]
        }
        if (phones.length > 0) await syncAirtableLeadsToDb(phones, db)
      }
    } catch {
      // Airtable errors must not break the page
    }
  }

  let leads: {
    id: string
    clientName: string
    eventDate: string
    participants: number
    status: string
    clientType: string
    eventType: string
    airtableRecordId: string | null
    location: { cityName: string } | null
    quote: { totalPrice: number } | null
  }[] = []

  try {
    const raw = await db.lead.findMany({
      select: {
        id: true,
        clientName: true,
        eventDate: true,
        participants: true,
        status: true,
        clientType: true,
        eventType: true,
        airtableRecordId: true,
        location: { select: { cityName: true } },
        quote: { select: { totalPrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    leads = raw.map((l) => ({
      ...l,
      status: l.status as string,
      clientType: l.clientType as string,
      eventType: l.eventType as string,
    }))
  } catch {
    // DB error — render empty board
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">לידים</h1>
        <Link
          href="/leads/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + ליד חדש
        </Link>
      </div>

      <KanbanBoard initialLeads={leads} />
    </div>
  )
}
