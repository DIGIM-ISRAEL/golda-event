// תצוגת לוח הבקרה — שכבת מצג טהורה (ללא DB), כדי שאפשר יהיה להשתמש בה
// גם בעמוד השרת האמיתי וגם במסך התצוגה לעיצוב. רכיב שרת (ללא hooks).
import Link from 'next/link'
import { CalendarDays, CalendarClock, PenLine, ChevronLeft, Plus, Eye } from 'lucide-react'
import { Card, CardHeader, PageHeader, StatCard, StatusBadge, ButtonLink } from '@/components/ui'
import { formatDate, formatTime } from '@/lib/utils'

export interface DashEvent {
  id: string
  clientName: string
  startTime: string
  endTime: string
  participants: number
  status: string
  location: { cityName: string } | null
}

export interface DashLead {
  id: string
  clientName: string
  eventDate: string
  participants?: number
  status?: string
  quoteViewedAt?: string | Date | null
  location: { cityName: string } | null
}

export interface DashStat {
  label: string
  value: React.ReactNode
  dotClass?: string
}

interface Props {
  stats: DashStat[]
  todayEvents: DashEvent[]
  tomorrowEvents: DashEvent[]
  awaitingSignature: DashLead[]
  recentLeads: DashLead[]
}

export default function DashboardView({
  stats,
  todayEvents,
  tomorrowEvents,
  awaitingSignature,
  recentLeads,
}: Props) {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="לוח בקרה"
        subtitle="סקירת הפעילות — אירועים קרובים, הצעות ולידים אחרונים"
        action={
          <ButtonLink href="/leads/new">
            <Plus size={16} />
            ליד חדש
          </ButtonLink>
        }
      />

      {/* מונים */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-7">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} dotClass={s.dotClass} />
        ))}
      </div>

      {/* אירועים היום + מחר */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5 mb-5">
        <EventsCard
          icon={<CalendarDays size={15} className="text-brand-gold" />}
          title="אירועים היום"
          emptyText="אין אירועים היום"
          events={todayEvents}
          accent
        />
        <EventsCard
          icon={<CalendarClock size={15} className="text-brand-gold/70" />}
          title="אירועים מחר"
          emptyText="אין אירועים מחר"
          events={tomorrowEvents}
        />
      </div>

      {/* ממתין לחתימה + לידים אחרונים */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
        <Card>
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <PenLine size={14} className="text-brand-gold" />
                ממתין לחתימת לקוח
              </span>
            }
            action={<span className="text-xs text-brand-muted">{awaitingSignature.length} למעקב</span>}
          />
          <RowList rows={awaitingSignature} empty="אין הצעות שממתינות לחתימה">
            {(lead) => (
              <>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-brand-ink truncate">{lead.clientName}</div>
                  <div className="text-xs text-brand-muted mt-0.5">
                    {formatDate(lead.eventDate)} · {lead.location?.cityName ?? '—'}
                  </div>
                </div>
                <span className="flex items-center gap-1.5 shrink-0">
                  {lead.quoteViewedAt && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold bg-[#F8F0DF] text-brand-gold-deep px-2 py-0.5 rounded-full">
                      <Eye size={11} />
                      נצפתה
                    </span>
                  )}
                  <span className="flex items-center gap-0.5 text-xs font-semibold text-brand-gold-deep">
                    למעקב
                    <ChevronLeft size={14} />
                  </span>
                </span>
              </>
            )}
          </RowList>
        </Card>

        <Card>
          <CardHeader
            title="לידים אחרונים"
            action={
              <Link
                href="/leads"
                className="text-xs font-semibold text-brand-gold-deep hover:text-brand-maroon transition-colors"
              >
                הצג הכל
              </Link>
            }
          />
          <RowList rows={recentLeads} empty="אין לידים עדיין">
            {(lead) => (
              <>
                <div className="min-w-0">
                  <div className="text-sm font-medium text-brand-ink truncate">{lead.clientName}</div>
                  <div className="text-xs text-brand-muted mt-0.5">
                    {formatDate(lead.eventDate)} · {lead.participants ?? 0} נפש · {lead.location?.cityName ?? '—'}
                  </div>
                </div>
                {lead.status && <StatusBadge status={lead.status} />}
              </>
            )}
          </RowList>
        </Card>
      </div>
    </div>
  )
}

/* ── כרטיס אירועים ───────────────────────────────────── */
function EventsCard({
  icon,
  title,
  emptyText,
  events,
  accent = false,
}: {
  icon: React.ReactNode
  title: string
  emptyText: string
  events: DashEvent[]
  accent?: boolean
}) {
  return (
    <Card className={accent ? 'ring-1 ring-brand-gold/25' : undefined}>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            {icon}
            {title}
          </span>
        }
        action={<span className="text-xs text-brand-muted">{events.length}</span>}
      />
      {events.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-brand-muted/70">{emptyText}</div>
      ) : (
        <div className="divide-y divide-brand-line/60">
          {events.map((ev) => (
            <Link
              key={ev.id}
              href={`/leads/${ev.id}`}
              className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-brand-cream/60 transition-colors"
            >
              <div className="min-w-0">
                <div className="text-sm font-medium text-brand-ink truncate">{ev.clientName}</div>
                <div className="text-xs text-brand-muted mt-0.5">
                  <span dir="ltr" className="inline-block">
                    {formatTime(ev.startTime)}–{formatTime(ev.endTime)}
                  </span>{' '}
                  · {ev.participants} נפש · {ev.location?.cityName ?? '—'}
                </div>
              </div>
              <StatusBadge status={ev.status} />
            </Link>
          ))}
        </div>
      )}
    </Card>
  )
}

/* ── רשימת שורות גנרית ───────────────────────────────── */
function RowList<T extends { id: string }>({
  rows,
  empty,
  children,
}: {
  rows: T[]
  empty: string
  children: (row: T) => React.ReactNode
}) {
  if (rows.length === 0) {
    return <div className="px-5 py-8 text-center text-sm text-brand-muted/70">{empty}</div>
  }
  return (
    <div className="divide-y divide-brand-line/60">
      {rows.map((row) => (
        <Link
          key={row.id}
          href={`/leads/${row.id}`}
          className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-brand-cream/60 transition-colors"
        >
          {children(row)}
        </Link>
      ))}
    </div>
  )
}
