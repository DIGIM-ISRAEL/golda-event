import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '@/lib/constants'
import { formatTime } from '@/lib/utils'
import type { Lead } from '@/lib/types'

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Get upcoming closed/reserved events
  const today = new Date().toISOString().split('T')[0]
  const { data: events } = await supabase
    .from('leads')
    .select('*, location:locations(city_name)')
    .in('status', ['closed', 'quote_sent', 'lead'])
    .gte('event_date', today)
    .order('event_date', { ascending: true })
    .order('start_time', { ascending: true })

  // Group by date
  const grouped: Record<string, Lead[]> = {}
  for (const e of events ?? []) {
    if (!grouped[e.event_date]) grouped[e.event_date] = []
    grouped[e.event_date].push(e)
  }

  function formatDateHebrew(dateStr: string) {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">לוח שנה</h1>
        <Link
          href="/leads/new"
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          + ליד חדש
        </Link>
      </div>

      {Object.keys(grouped).length === 0 && (
        <div className="bg-white rounded-xl p-10 text-center text-gray-400 shadow-sm border border-gray-100">
          אין אירועים מתוכננים קרובים
        </div>
      )}

      <div className="space-y-4">
        {Object.entries(grouped).map(([date, dayLeads]) => (
          <div key={date} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-blue-600 px-5 py-3">
              <h2 className="text-white font-semibold text-sm">{formatDateHebrew(date)}</h2>
              {dayLeads.length > 1 && (
                <p className="text-blue-200 text-xs mt-0.5">
                  ⚠️ {dayLeads.length} אירועים באותו יום — בדוק זמני נסיעה בין המיקומים
                </p>
              )}
            </div>
            <div className="divide-y divide-gray-50">
              {dayLeads.map((lead: Lead & { location?: { city_name: string } }) => (
                <Link
                  key={lead.id}
                  href={`/leads/${lead.id}`}
                  className="flex items-center justify-between px-5 py-4 hover:bg-gray-50"
                >
                  <div>
                    <div className="font-medium text-gray-900">{lead.client_name}</div>
                    <div className="text-sm text-gray-500">
                      {formatTime(lead.start_time)} – {formatTime(lead.end_time)} ·{' '}
                      {lead.participants} נפש ·{' '}
                      {lead.location?.city_name ?? '—'}
                    </div>
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full ${LEAD_STATUS_COLORS[lead.status]}`}>
                    {LEAD_STATUS_LABELS[lead.status]}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
