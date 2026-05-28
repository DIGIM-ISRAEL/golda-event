import Link from 'next/link'
import { db } from '@/lib/db'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/constants'
import { formatDate, formatTime } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const [leads, allStatuses, todayEvents, tomorrowEvents, awaitingSignature] =
    await Promise.all([
      db.lead.findMany({
        include: { location: true },
        orderBy: { createdAt: 'desc' },
        take: 8,
      }),
      db.lead.findMany({ select: { status: true } }),
      db.lead.findMany({
        where: { eventDate: todayStr, status: { in: ['closed', 'quote_sent'] } },
        include: { location: true },
        orderBy: { startTime: 'asc' },
      }),
      db.lead.findMany({
        where: { eventDate: tomorrowStr, status: { in: ['closed', 'quote_sent'] } },
        include: { location: true },
        orderBy: { startTime: 'asc' },
      }),
      db.lead.findMany({
        where: { status: 'quote_sent', clientApprovedAt: null },
        include: { location: true },
        orderBy: { updatedAt: 'asc' },
        take: 6,
      }),
    ])

  const statusCounts = allStatuses.reduce(
    (acc: Record<string, number>, l) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1
      return acc
    },
    {},
  )

  const stats = [
    { label: 'לידים פתוחים', value: statusCounts['lead'] ?? 0, color: 'bg-brand-gold' },
    { label: 'הצעות שנשלחו', value: statusCounts['quote_sent'] ?? 0, color: 'bg-yellow-500' },
    { label: 'סגורים / שמורים', value: statusCounts['closed'] ?? 0, color: 'bg-green-500' },
    { label: 'בוצעו', value: statusCounts['done'] ?? 0, color: 'bg-gray-500' },
  ]

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">לוח בקרה</h1>
        <Link
          href="/leads/new"
          className="bg-brand-maroon text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-maroon-dark transition-colors"
        >
          + ליד חדש
        </Link>
      </div>

      {/* מונים */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-4 md:p-5 shadow-sm border border-gray-100">
            <div className={`w-2 h-8 ${s.color} rounded-full mb-3`} />
            <div className="text-2xl md:text-3xl font-bold text-gray-900">{s.value}</div>
            <div className="text-xs md:text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* אירועים היום + מחר */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <EventsCard title="📅 אירועים היום" emptyText="אין אירועים היום" events={todayEvents} highlight />
        <EventsCard title="🔜 אירועים מחר" emptyText="אין אירועים מחר" events={tomorrowEvents} />
      </div>

      {/* ממתין לחתימה + לידים אחרונים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ממתין לחתימת לקוח / מעקב */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">✍️ ממתין לחתימת לקוח</h2>
            <span className="text-xs text-gray-400">{awaitingSignature.length} למעקב</span>
          </div>
          <div className="divide-y divide-gray-50">
            {awaitingSignature.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                אין הצעות שממתינות לחתימה 🎉
              </div>
            )}
            {awaitingSignature.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">{lead.clientName}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(lead.eventDate)} · {lead.location?.cityName ?? '—'}
                  </div>
                </div>
                <span className="text-xs text-orange-600 font-medium">למעקב ←</span>
              </Link>
            ))}
          </div>
        </div>

        {/* לידים אחרונים */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">לידים אחרונים</h2>
            <Link href="/leads" className="text-sm text-brand-maroon hover:text-brand-maroon-dark">הצג הכל</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {leads.length === 0 && (
              <div className="px-5 py-8 text-center text-gray-400 text-sm">
                אין לידים עדיין —{' '}
                <Link href="/leads/new" className="text-brand-maroon">צור ליד ראשון</Link>
              </div>
            )}
            {leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
              >
                <div>
                  <div className="font-medium text-gray-900 text-sm">{lead.clientName}</div>
                  <div className="text-xs text-gray-500">
                    {formatDate(lead.eventDate)} · {lead.participants} נפש · {lead.location?.cityName ?? '—'}
                  </div>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full shrink-0 ${LEAD_STATUS_COLORS[lead.status]}`}>
                  {LEAD_STATUS_LABELS[lead.status]}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function EventsCard({
  title,
  emptyText,
  events,
  highlight = false,
}: {
  title: string
  emptyText: string
  events: {
    id: string
    clientName: string
    startTime: string
    endTime: string
    participants: number
    status: string
    location: { cityName: string } | null
  }[]
  highlight?: boolean
}) {
  return (
    <div
      className={`rounded-xl shadow-sm border overflow-hidden ${
        highlight ? 'bg-brand-maroon border-brand-maroon' : 'bg-white border-gray-100'
      }`}
    >
      <div className={`px-5 py-3 ${highlight ? 'text-white' : 'text-gray-900'}`}>
        <h2 className="font-semibold text-sm">{title}</h2>
      </div>
      <div className={highlight ? 'bg-white' : ''}>
        {events.length === 0 && (
          <div className="px-5 py-6 text-center text-gray-400 text-sm">{emptyText}</div>
        )}
        <div className="divide-y divide-gray-50">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/leads/${ev.id}`}
              className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900 text-sm">{ev.clientName}</div>
                <div className="text-xs text-gray-500">
                  {formatTime(ev.startTime)}–{formatTime(ev.endTime)} · {ev.participants} נפש · {ev.location?.cityName ?? '—'}
                </div>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${LEAD_STATUS_COLORS[ev.status]}`}>
                {LEAD_STATUS_LABELS[ev.status]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
