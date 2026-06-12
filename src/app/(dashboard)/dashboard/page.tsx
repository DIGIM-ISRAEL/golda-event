import { db } from '@/lib/db'
import { LEAD_STATUS_DOTS } from '@/lib/constants'
import { israelDateStr } from '@/lib/utils'
import DashboardView from '@/components/dashboard/DashboardView'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const todayStr = israelDateStr()
  const tomorrowStr = israelDateStr(1)

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
    { label: 'לידים פתוחים', value: statusCounts['lead'] ?? 0, dotClass: LEAD_STATUS_DOTS['lead'] },
    { label: 'הצעות שנשלחו', value: statusCounts['quote_sent'] ?? 0, dotClass: LEAD_STATUS_DOTS['quote_sent'] },
    { label: 'סגורים / שמורים', value: statusCounts['closed'] ?? 0, dotClass: LEAD_STATUS_DOTS['closed'] },
    { label: 'בוצעו', value: statusCounts['done'] ?? 0, dotClass: LEAD_STATUS_DOTS['done'] },
  ]

  return (
    <DashboardView
      stats={stats}
      todayEvents={todayEvents}
      tomorrowEvents={tomorrowEvents}
      awaitingSignature={awaitingSignature}
      recentLeads={leads}
    />
  )
}
