import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Lead } from '@/lib/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*, location:locations(city_name)')
    .order('created_at', { ascending: false })
    .limit(10)

  const { data: counts } = await supabase
    .from('leads')
    .select('status')

  const statusCounts = (counts ?? []).reduce(
    (acc: Record<string, number>, l: { status: string }) => {
      acc[l.status] = (acc[l.status] ?? 0) + 1
      return acc
    },
    {},
  )

  const stats = [
    { label: 'לידים פתוחים', value: statusCounts['lead'] ?? 0, color: 'bg-blue-500' },
    { label: 'הצעות שנשלחו', value: statusCounts['quote_sent'] ?? 0, color: 'bg-yellow-500' },
    { label: 'סגורים / שמורים', value: statusCounts['closed'] ?? 0, color: 'bg-green-500' },
    { label: 'בוצעו', value: statusCounts['done'] ?? 0, color: 'bg-gray-500' },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">לוח בקרה</h1>
        <Link
          href="/leads/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + ליד חדש
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <div className={`w-2 h-8 ${s.color} rounded-full mb-3`} />
            <div className="text-3xl font-bold text-gray-900">{s.value}</div>
            <div className="text-sm text-gray-500 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Recent leads */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900">לידים אחרונים</h2>
          <Link href="/leads" className="text-sm text-blue-600 hover:text-blue-700">
            הצג הכל
          </Link>
        </div>
        <div className="divide-y divide-gray-50">
          {(leads ?? []).length === 0 && (
            <div className="px-6 py-10 text-center text-gray-400 text-sm">
              אין לידים עדיין —{' '}
              <Link href="/leads/new" className="text-blue-600">
                צור ליד ראשון
              </Link>
            </div>
          )}
          {(leads ?? []).map((lead: Lead & { location?: { city_name: string } }) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className="flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
            >
              <div>
                <div className="font-medium text-gray-900">{lead.client_name}</div>
                <div className="text-sm text-gray-500">
                  {formatDate(lead.event_date)} · {lead.participants} נפש ·{' '}
                  {lead.location?.city_name ?? '—'}
                </div>
              </div>
              <span
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEAD_STATUS_COLORS[lead.status]}`}
              >
                {LEAD_STATUS_LABELS[lead.status]}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
