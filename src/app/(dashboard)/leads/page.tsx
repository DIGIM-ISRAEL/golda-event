import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS, CLIENT_TYPE_LABELS, EVENT_TYPE_LABELS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import type { Lead } from '@/lib/types'

export default async function LeadsPage() {
  const supabase = await createClient()

  const { data: leads } = await supabase
    .from('leads')
    .select('*, location:locations(city_name), quote:quotes(*)')
    .order('event_date', { ascending: true })

  const statuses = ['lead', 'quote_sent', 'closed', 'done', 'canceled']

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

      {/* Pipeline columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {statuses.map((status) => {
          const statusLeads = (leads ?? []).filter((l: Lead) => l.status === status)
          return (
            <div key={status} className="bg-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-3">
                <span
                  className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEAD_STATUS_COLORS[status]}`}
                >
                  {LEAD_STATUS_LABELS[status]}
                </span>
                <span className="text-xs text-gray-500">{statusLeads.length}</span>
              </div>
              <div className="space-y-2">
                {statusLeads.map((lead: Lead & { location?: { city_name: string } }) => (
                  <Link
                    key={lead.id}
                    href={`/leads/${lead.id}`}
                    className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-100"
                  >
                    <div className="font-semibold text-gray-900 text-sm">{lead.client_name}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatDate(lead.event_date)}</div>
                    <div className="text-xs text-gray-500">{lead.participants} נפש</div>
                    {lead.location?.city_name && (
                      <div className="text-xs text-gray-400 mt-1">📍 {lead.location.city_name}</div>
                    )}
                    <div className="mt-2 flex gap-1 flex-wrap">
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {CLIENT_TYPE_LABELS[lead.client_type]}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {EVENT_TYPE_LABELS[lead.event_type]}
                      </span>
                    </div>
                  </Link>
                ))}
                {statusLeads.length === 0 && (
                  <div className="text-xs text-gray-400 text-center py-4">ריק</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
