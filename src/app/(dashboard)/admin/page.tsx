import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { calculateInventory, calculateProfitability } from '@/lib/inventory'
import { formatNIS } from '@/lib/pricing'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/constants'
import { formatDate } from '@/lib/utils'
import Link from 'next/link'
import type { LeadStatus } from '@/lib/types'

export default async function AdminPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')

  const [leads, settingsRows] = await Promise.all([
    db.lead.findMany({
      where: { status: { in: ['closed', 'quote_sent'] } },
      include: { location: true, quote: true },
      orderBy: { eventDate: 'asc' },
    }),
    db.settings.findMany(),
  ])

  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))
  const basketaCost = Number(settingsMap['basketa_cost_nis'] ?? 150)
  const profitThreshold = Number(settingsMap['profit_warning_threshold'] ?? 1000)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">רווחיות פנימית</h1>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">אירועים פעילים</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs">
                <th className="text-right px-4 py-3 font-medium">לקוח</th>
                <th className="text-right px-4 py-3 font-medium">תאריך</th>
                <th className="text-right px-4 py-3 font-medium">סטטוס</th>
                <th className="text-right px-4 py-3 font-medium">הכנסה</th>
                <th className="text-right px-4 py-3 font-medium">עלויות</th>
                <th className="text-right px-4 py-3 font-medium">רווח</th>
                <th className="text-right px-4 py-3 font-medium">בסקטות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {leads.map((lead) => {
                const totalPrice = lead.quote?.totalPrice ?? 0
                const logisticsCost = lead.location?.travelCostNis ?? 0
                const inventory = calculateInventory(lead.participants, basketaCost)
                const profitability = calculateProfitability(
                  totalPrice, logisticsCost, lead.managerIncluded,
                  lead.assistantsCount, inventory.estimatedCost, profitThreshold,
                )

                return (
                  <tr key={lead.id} className={profitability.isWarning ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`} className="font-medium text-gray-900 hover:text-blue-700">
                        {lead.clientName}
                      </Link>
                      <div className="text-xs text-gray-400">{lead.location?.cityName}</div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(lead.eventDate)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${LEAD_STATUS_COLORS[lead.status as LeadStatus]}`}>
                        {LEAD_STATUS_LABELS[lead.status as LeadStatus]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium">{formatNIS(totalPrice)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatNIS(profitability.totalCost)}</td>
                    <td className="px-4 py-3">
                      <span className={`font-semibold ${profitability.isWarning ? 'text-red-600' : 'text-green-700'}`}>
                        {profitability.isWarning && '⚠️ '}
                        {formatNIS(profitability.netProfit)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium">{inventory.basketasRequired}</td>
                  </tr>
                )
              })}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">אין אירועים פעילים</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
