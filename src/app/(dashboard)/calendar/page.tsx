import { db } from '@/lib/db'
import { redirect } from 'next/navigation'
import { getSession } from '@/lib/session'
import { israelDateStr } from '@/lib/utils'
import Link from 'next/link'
import { LEAD_STATUS_COLORS, LEAD_STATUS_LABELS } from '@/lib/constants'
import type { LeadStatus } from '@/lib/types'
import { ChevronRight, ChevronLeft, Plus } from 'lucide-react'

const HEBREW_MONTHS = [
  'ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני',
  'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר',
]
const HEBREW_DAYS_SHORT = ['א׳', 'ב׳', 'ג׳', 'ד׳', 'ה׳', 'ו׳', 'ש׳']

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}) {
  const session = await getSession()
  if (!session) redirect('/login')

  const { month: monthParam } = await searchParams

  // היום בשעון ישראל — גם להדגשת "היום" וגם לחודש ברירת המחדל
  const todayStr = israelDateStr()
  let year = Number(todayStr.slice(0, 4))
  let month = Number(todayStr.slice(5, 7)) - 1 // 0-indexed

  if (monthParam && /^\d{4}-\d{2}$/.test(monthParam)) {
    const [y, m] = monthParam.split('-').map(Number)
    year = y
    month = m - 1
  }

  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)

  const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`
  const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

  const events = await db.lead.findMany({
    where: {
      status: { notIn: ['canceled'] },
      eventDate: { gte: monthStart, lte: monthEnd },
    },
    include: { location: true },
    orderBy: [{ startTime: 'asc' }],
  })

  // מיון לפי תאריך
  const byDate: Record<string, typeof events> = {}
  for (const e of events) {
    if (!byDate[e.eventDate]) byDate[e.eventDate] = []
    byDate[e.eventDate].push(e)
  }

  // ניווט חודשים
  const prevDate = new Date(year, month - 1, 1)
  const nextDate = new Date(year, month + 1, 1)
  const prevMonth = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
  const nextMonth = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`

  // בניית גריד — שבוע מתחיל בראשון (0=ראשון)
  const firstDayOfWeek = firstDay.getDay()
  const totalDays = lastDay.getDate()
  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const currentMonthStr = `${year}-${String(month + 1).padStart(2, '0')}`
  const nowMonthStr = todayStr.slice(0, 7)

  return (
    <div className="p-4 h-full flex flex-col gap-3" dir="rtl">
      {/* כותרת */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-brand-ink">לוח שנה</h1>
        <div className="flex items-center gap-2">
          {currentMonthStr !== nowMonthStr && (
            <Link
              href="/calendar"
              className="text-sm text-brand-maroon hover:underline px-3 py-1.5"
            >
              חזור להיום
            </Link>
          )}
          <Link
            href={`/calendar?month=${prevMonth}`}
            className="p-2 rounded-lg hover:bg-brand-cream/60 text-brand-muted transition-colors"
            title="חודש קודם"
          >
            <ChevronRight size={20} />
          </Link>
          <span className="text-base font-bold text-brand-ink min-w-[130px] text-center">
            {HEBREW_MONTHS[month]} {year}
          </span>
          <Link
            href={`/calendar?month=${nextMonth}`}
            className="p-2 rounded-lg hover:bg-brand-cream/60 text-brand-muted transition-colors"
            title="חודש הבא"
          >
            <ChevronLeft size={20} />
          </Link>
          <Link
            href="/leads/new"
            className="flex items-center gap-1.5 bg-brand-maroon text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-maroon-dark transition-colors mr-1"
          >
            <Plus size={16} />
            ליד חדש
          </Link>
        </div>
      </div>

      {/* לוח שנה */}
      <div className="flex-1 bg-white rounded-2xl border border-brand-line shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)] overflow-hidden flex flex-col">
        {/* כותרות ימים */}
        <div className="grid grid-cols-7 border-b border-brand-line bg-brand-cream/60">
          {HEBREW_DAYS_SHORT.map((day, i) => (
            <div
              key={day}
              className={`py-2.5 text-center text-xs font-bold tracking-wide ${
                i === 5 || i === 6 ? 'text-brand-gold' : 'text-brand-muted'
              }`}
            >
              {day}
            </div>
          ))}
        </div>

        {/* שבועות */}
        <div
          className="flex-1 grid"
          style={{ gridTemplateRows: `repeat(${cells.length / 7}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: cells.length / 7 }, (_, weekIdx) => (
            <div
              key={weekIdx}
              className="grid grid-cols-7 border-b border-brand-line last:border-b-0"
            >
              {cells.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, dayIdx) => {
                const dateStr = day
                  ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
                  : null
                const dayEvents = dateStr ? (byDate[dateStr] ?? []) : []
                const isToday = dateStr === todayStr
                const isWeekend = dayIdx === 5 || dayIdx === 6

                return (
                  <div
                    key={dayIdx}
                    className={`p-1.5 border-l border-brand-line first:border-l-0 overflow-hidden ${
                      !day ? 'bg-brand-cream/60' : ''
                    } ${isWeekend && day ? 'bg-brand-mint/20' : ''}`}
                  >
                    {day && (
                      <>
                        {/* מספר היום */}
                        <div className="flex justify-end mb-1">
                          <span
                            className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium ${
                              isToday
                                ? 'bg-brand-maroon text-white shadow-sm'
                                : 'text-brand-ink'
                            }`}
                          >
                            {day}
                          </span>
                        </div>

                        {/* אירועים */}
                        <div className="space-y-0.5">
                          {dayEvents.map(ev => (
                            <Link
                              key={ev.id}
                              href={`/leads/${ev.id}`}
                              className={`flex items-center gap-1 w-full px-1.5 py-0.5 rounded text-xs font-medium truncate hover:opacity-75 transition-opacity ${
                                LEAD_STATUS_COLORS[ev.status as LeadStatus]
                              }`}
                              title={`${ev.clientName}${ev.location ? ` · ${ev.location.cityName}` : ''} | ${ev.startTime?.slice(0, 5)}–${ev.endTime?.slice(0, 5)}`}
                            >
                              <span className="truncate">{ev.clientName}</span>
                              {ev.location && (
                                <span className="opacity-60 shrink-0 hidden lg:inline">
                                  · {ev.location.cityName}
                                </span>
                              )}
                            </Link>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* מקרא */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-xs text-brand-muted font-medium">סטטוסים:</span>
        {Object.entries(LEAD_STATUS_LABELS)
          .filter(([s]) => s !== 'canceled')
          .map(([status, label]) => (
            <span
              key={status}
              className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${LEAD_STATUS_COLORS[status]}`}
            >
              {label}
            </span>
          ))}
      </div>
    </div>
  )
}
