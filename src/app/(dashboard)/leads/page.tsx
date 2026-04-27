import Link from 'next/link'
import { db } from '@/lib/db'
import KanbanBoard from '@/components/leads/KanbanBoard'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  let leads: {
    id: string
    clientName: string
    eventDate: string
    participants: number
    status: string
    clientType: string
    eventType: string
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

  const hasAirtable = !!process.env.AIRTABLE_API_KEY

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

      <KanbanBoard initialLeads={leads} hasAirtable={hasAirtable} />
    </div>
  )
}
