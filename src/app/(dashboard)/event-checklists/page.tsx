import Link from 'next/link'
import { CalendarDays, MapPin, Users, ChevronLeft } from 'lucide-react'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import { formatDate, formatTime } from '@/lib/utils'
import { StatusBadge } from '@/components/ui'

export const dynamic = 'force-dynamic'

// רק לידים שסגרו אירוע: "סגור / שמור" (פעילים) ו"בוצע" (הסתיימו).
export default async function EventChecklistsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const leads = await db.lead
    .findMany({
      where: { status: { in: ['closed', 'done'] } },
      include: { location: true },
      orderBy: { eventDate: 'asc' },
    })
    .catch(() => [])

  const active = leads.filter((l) => l.status === 'closed')
  const completed = leads.filter((l) => l.status === 'done')

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-brand-ink">צ&apos;קליסט אירועים</h1>
        <p className="text-sm text-brand-muted mt-0.5">אירועים שנסגרו — הכנה, החזרות וסיכום עלות</p>
      </div>

      <Section title="אירועים פעילים" empty="אין אירועים סגורים כרגע" leads={active} />
      {completed.length > 0 && (
        <div className="mt-8">
          <Section title="אירועים שהסתיימו" empty="" leads={completed} dim />
        </div>
      )}
    </div>
  )
}

function Section({
  title,
  empty,
  leads,
  dim = false,
}: {
  title: string
  empty: string
  leads: {
    id: string
    clientName: string
    eventDate: string
    startTime: string
    endTime: string
    participants: number
    status: string
    location: { cityName: string } | null
  }[]
  dim?: boolean
}) {
  return (
    <div>
      <h2 className="text-sm font-bold text-brand-muted uppercase tracking-wide mb-3">{title}</h2>
      {leads.length === 0 ? (
        <div className="text-sm text-brand-muted/70 text-center py-8 bg-brand-cream/40 rounded-2xl border border-brand-line/60">
          {empty}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {leads.map((lead) => (
            <Link
              key={lead.id}
              href={`/leads/${lead.id}`}
              className={`block bg-white rounded-2xl border border-brand-line p-4 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)] hover:border-brand-gold/40 transition-colors ${dim ? 'opacity-70' : ''}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-semibold text-brand-ink leading-tight">{lead.clientName}</div>
                <StatusBadge status={lead.status} />
              </div>
              <div className="space-y-1 text-xs text-brand-muted">
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={13} className="text-brand-gold/70" />
                  {formatDate(lead.eventDate)} ·{' '}
                  <span dir="ltr">{formatTime(lead.startTime)}–{formatTime(lead.endTime)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin size={13} className="text-brand-gold/70" />
                  {lead.location?.cityName ?? '—'}
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={13} className="text-brand-gold/70" />
                  {lead.participants} משתתפים
                </div>
              </div>
              <div className="mt-3 flex items-center justify-end gap-0.5 text-xs font-semibold text-brand-gold-deep">
                פתח צ&apos;קליסט
                <ChevronLeft size={14} />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
