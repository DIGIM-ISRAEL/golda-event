import Link from 'next/link'
import { redirect } from 'next/navigation'
import { TrendingUp, Wallet, Banknote, Hourglass, Undo2, PartyPopper } from 'lucide-react'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { computeEventCost, parseSupplies, type EventLog } from '@/lib/event-cost'
import { formatNIS } from '@/lib/pricing'
import { formatDate, israelDateStr, cn } from '@/lib/utils'
import { MANAGER_COST, ASSISTANT_COST } from '@/lib/constants'
import { Card, CardHeader, PageHeader, StatusBadge } from '@/components/ui'

export const dynamic = 'force-dynamic'

const HEBREW_MONTHS_SHORT = ['ינו׳', 'פבר׳', 'מרץ', 'אפר׳', 'מאי', 'יונ׳', 'יול׳', 'אוג׳', 'ספט׳', 'אוק׳', 'נוב׳', 'דצמ׳']

interface EventRow {
  id: string
  clientName: string
  cityName: string | null
  eventDate: string
  status: string
  participants: number
  revenue: number
  totalCost: number
  profit: number
  margin: number // 0..1
  returnCredit: number
  basketas: number
}

export default async function AdminDashboardPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')

  const [leads, settingsRows] = await Promise.all([
    db.lead.findMany({
      where: { status: { in: ['quote_sent', 'closed', 'done'] } },
      include: { location: true, quote: true, flavors: { include: { flavor: true } } },
      orderBy: { eventDate: 'asc' },
    }),
    db.settings.findMany(),
  ])

  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))
  const basketaCost = Number(settingsMap['basketa_cost_nis'] ?? 150)
  const profitThreshold = Number(settingsMap['profit_warning_threshold'] ?? 1000)
  const supplies = parseSupplies(settingsMap['supply_costs'])

  // חישוב שורה כספית לכל אירוע — עלות אמיתית כולל החזרות (למי שתועדו)
  const rows: EventRow[] = leads.map((lead) => {
    const cost = computeEventCost({
      flavors: lead.flavors.map((lf) => ({
        id: lf.flavor.id,
        name: lf.flavor.name,
        costPerBasketa: lf.flavor.costPerBasketa,
      })),
      participants: lead.participants,
      fallbackBasketaCost: basketaCost,
      eventLog: (lead.eventLog as EventLog | null) ?? null,
      supplies,
    })
    const staff = (lead.managerIncluded ? MANAGER_COST : 0) + lead.assistantsCount * ASSISTANT_COST
    const logistics = lead.location?.travelCostNis ?? 0
    const revenue = lead.quote?.totalPrice ?? 0
    const totalCost = cost.goodsCost + staff + logistics
    const profit = revenue - totalCost
    return {
      id: lead.id,
      clientName: lead.clientName,
      cityName: lead.location?.cityName ?? null,
      eventDate: lead.eventDate,
      status: lead.status,
      participants: lead.participants,
      revenue,
      totalCost,
      profit,
      margin: revenue > 0 ? profit / revenue : 0,
      returnCredit: cost.iceCreamReturn,
      basketas: cost.basketasRequired,
    }
  })

  // ── KPI: החודש הנוכחי (אירועים שנסגרו/בוצעו, לפי תאריך האירוע) ──
  const todayStr = israelDateStr()
  const thisMonthKey = todayStr.slice(0, 7)
  const soldStatuses = new Set(['closed', 'done'])
  const monthRows = rows.filter((r) => soldStatuses.has(r.status) && r.eventDate.startsWith(thisMonthKey))
  const revenueMonth = monthRows.reduce((s, r) => s + r.revenue, 0)
  const costMonth = monthRows.reduce((s, r) => s + r.totalCost, 0)
  const profitMonth = revenueMonth - costMonth
  const marginMonth = revenueMonth > 0 ? profitMonth / revenueMonth : 0
  const returnsSavedMonth = monthRows.reduce((s, r) => s + r.returnCredit, 0)

  const pipelineRows = rows.filter((r) => r.status === 'quote_sent')
  const pipelineTotal = pipelineRows.reduce((s, r) => s + r.revenue, 0)

  // ── מגמת רווח 6 חודשים ──
  const [cy, cm] = [Number(todayStr.slice(0, 4)), Number(todayStr.slice(5, 7))]
  const trend = Array.from({ length: 6 }, (_, i) => {
    const offset = 5 - i
    let y = cy
    let m = cm - offset
    while (m < 1) {
      m += 12
      y -= 1
    }
    const key = `${y}-${String(m).padStart(2, '0')}`
    const monthProfit = rows
      .filter((r) => soldStatuses.has(r.status) && r.eventDate.startsWith(key))
      .reduce((s, r) => s + r.profit, 0)
    const monthRevenue = rows
      .filter((r) => soldStatuses.has(r.status) && r.eventDate.startsWith(key))
      .reduce((s, r) => s + r.revenue, 0)
    return { key, label: HEBREW_MONTHS_SHORT[m - 1], profit: monthProfit, revenue: monthRevenue }
  })
  const trendMax = Math.max(1, ...trend.map((t) => Math.abs(t.profit)))

  // ── טבלאות ──
  const active = rows.filter((r) => r.status !== 'done')
  const completed = rows.filter((r) => r.status === 'done').reverse()

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="רווחיות"
        subtitle="תמונה כספית — הכנסות, עלויות ורווח אמיתי לכל אירוע (כולל החזרות)"
      />

      {/* ── כרטיסי KPI ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-4">
        <KpiCard
          icon={<Banknote size={16} className="text-brand-gold-deep" />}
          label="הכנסות החודש"
          value={formatNIS(revenueMonth)}
          sub={`${monthRows.length} אירועים`}
        />
        <KpiCard
          icon={<Wallet size={16} className="text-brand-gold-deep" />}
          label="עלויות החודש"
          value={formatNIS(costMonth)}
          sub={returnsSavedMonth > 0 ? `אחרי חיסכון ${formatNIS(returnsSavedMonth)} מהחזרות` : 'גלידה + כלים + עובדים + נסיעות'}
        />
        <KpiCard
          icon={<TrendingUp size={16} className={profitMonth >= 0 ? 'text-[#3D5A30]' : 'text-[#B0473A]'} />}
          label="רווח נקי החודש"
          value={
            <span className={profitMonth >= 0 ? 'text-[#3D5A30]' : 'text-[#B0473A]'}>
              {formatNIS(profitMonth)}
            </span>
          }
          sub={revenueMonth > 0 ? `${Math.round(marginMonth * 100)}% שוליים` : '—'}
        />
        <KpiCard
          icon={<Hourglass size={16} className="text-brand-gold-deep" />}
          label="צנרת פתוחה"
          value={formatNIS(pipelineTotal)}
          sub={`${pipelineRows.length} הצעות ממתינות לחתימה`}
        />
      </div>

      {/* ── מגמת רווח ── */}
      <Card className="mb-4">
        <CardHeader title="רווח לפי חודש (6 חודשים אחרונים)" />
        <div className="p-5">
          <div className="flex items-end justify-between gap-2 h-32">
            {trend.map((t) => {
              const h = Math.round((Math.abs(t.profit) / trendMax) * 100)
              const isCurrent = t.key === thisMonthKey
              return (
                <div key={t.key} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <span
                    dir="ltr"
                    className={cn(
                      'text-[10px] tabular-nums',
                      t.profit < 0 ? 'text-[#B0473A]' : 'text-brand-muted',
                    )}
                  >
                    {t.profit !== 0 ? `₪${Math.round(t.profit / 1000)}K` : ''}
                  </span>
                  <div className="w-full flex items-end justify-center h-20">
                    <div
                      className={cn(
                        'w-3/5 max-w-10 rounded-t-md transition-all',
                        t.profit < 0 ? 'bg-[#E6BCB2]' : isCurrent ? 'bg-brand-gold' : 'bg-brand-gold/40',
                      )}
                      style={{ height: `${Math.max(t.profit !== 0 ? 6 : 2, h)}%` }}
                    />
                  </div>
                  <span className={cn('text-[11px]', isCurrent ? 'font-bold text-brand-ink' : 'text-brand-muted')}>
                    {t.label}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      </Card>

      {/* ── אירועים פעילים ── */}
      <EventsTable
        title="אירועים פעילים (הצעות + סגורים)"
        rows={active}
        profitThreshold={profitThreshold}
        emptyText="אין אירועים פעילים"
      />

      {/* ── הושלמו ── */}
      {completed.length > 0 && (
        <div className="mt-4">
          <EventsTable
            title={
              <span className="flex items-center gap-2">
                <PartyPopper size={15} className="text-brand-gold" />
                אירועים שהושלמו
              </span>
            }
            rows={completed}
            profitThreshold={profitThreshold}
            emptyText=""
            showReturns
          />
        </div>
      )}
    </div>
  )
}

/* ── כרטיס KPI ─────────────────────────────── */
function KpiCard({
  icon,
  label,
  value,
  sub,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
  sub?: string
}) {
  return (
    <Card className="p-4 md:p-5">
      <div className="flex items-center gap-2 mb-2.5">
        {icon}
        <span className="text-xs md:text-[13px] text-brand-muted">{label}</span>
      </div>
      <div dir="ltr" className="font-serif text-2xl md:text-[27px] font-bold text-brand-ink leading-none text-right">
        {value}
      </div>
      {sub && <div className="text-[11px] text-brand-muted mt-2 truncate">{sub}</div>}
    </Card>
  )
}

/* ── טבלת אירועים ─────────────────────────────── */
function EventsTable({
  title,
  rows,
  profitThreshold,
  emptyText,
  showReturns = false,
}: {
  title: React.ReactNode
  rows: EventRow[]
  profitThreshold: number
  emptyText: string
  showReturns?: boolean
}) {
  return (
    <Card className="overflow-hidden">
      <CardHeader title={title} action={<span className="text-xs text-brand-muted">{rows.length}</span>} />
      {rows.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm text-brand-muted/70">{emptyText}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-brand-cream/60 text-brand-muted text-xs">
                <th className="text-right px-4 py-3 font-medium">לקוח</th>
                <th className="text-right px-4 py-3 font-medium">תאריך</th>
                <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium">הכנסה</th>
                <th className="text-right px-4 py-3 font-medium">עלות</th>
                <th className="text-right px-4 py-3 font-medium">רווח</th>
                <th className="text-right px-4 py-3 font-medium">שוליים</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-line">
              {rows.map((r) => {
                const warn = r.revenue > 0 && r.profit < profitThreshold
                return (
                  <tr key={r.id} className={warn ? 'bg-brand-maroon/5' : 'hover:bg-brand-cream/60'}>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${r.id}`} className="font-medium text-brand-ink hover:text-brand-maroon-dark">
                        {r.clientName}
                      </Link>
                      <div className="text-xs text-brand-muted">
                        {r.cityName ?? '—'} · {r.participants} נפש
                        {showReturns && r.returnCredit > 0 && (
                          <span className="text-[#3D5A30]">
                            {' '}
                            · <Undo2 size={10} className="inline" /> חזרות {formatNIS(r.returnCredit)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-brand-muted whitespace-nowrap">{formatDate(r.eventDate)}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-4 py-3 font-medium whitespace-nowrap" dir="ltr">
                      {formatNIS(r.revenue)}
                    </td>
                    <td className="px-4 py-3 text-brand-muted whitespace-nowrap" dir="ltr">
                      {formatNIS(r.totalCost)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap" dir="ltr">
                      <span className={cn('font-semibold', warn ? 'text-brand-maroon' : r.profit >= 0 ? 'text-[#3D5A30]' : 'text-[#B0473A]')}>
                        {warn && '⚠️ '}
                        {formatNIS(r.profit)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <MarginBar margin={r.margin} hasRevenue={r.revenue > 0} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

/* ── פס שוליים ─────────────────────────────── */
function MarginBar({ margin, hasRevenue }: { margin: number; hasRevenue: boolean }) {
  if (!hasRevenue) return <span className="text-xs text-brand-muted/60">—</span>
  const pct = Math.round(margin * 100)
  const width = Math.max(4, Math.min(100, Math.abs(pct)))
  return (
    <div className="flex items-center gap-2 min-w-[90px]">
      <div className="flex-1 h-1.5 bg-brand-line/50 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', pct >= 40 ? 'bg-[#6E9A5B]' : pct >= 15 ? 'bg-brand-gold' : 'bg-[#D08770]')}
          style={{ width: `${width}%` }}
        />
      </div>
      <span dir="ltr" className="text-xs text-brand-muted tabular-nums w-9 text-left">
        {pct}%
      </span>
    </div>
  )
}
