'use client'

import { calculateInventory, calculateProfitability } from '@/lib/inventory'
import { formatNIS } from '@/lib/pricing'
import { MANAGER_COST, ASSISTANT_COST } from '@/lib/constants'

interface Props {
  totalCustomerPrice: number
  logisticsCost: number
  managerIncluded: boolean
  assistantsCount: number
  participants: number
  basketaCostNis: number
  profitWarningThreshold: number
}

export default function ProfitabilityPanel({
  totalCustomerPrice,
  logisticsCost,
  managerIncluded,
  assistantsCount,
  participants,
  basketaCostNis,
  profitWarningThreshold,
}: Props) {
  const inventory = calculateInventory(participants, basketaCostNis)
  const profitability = calculateProfitability(
    totalCustomerPrice,
    logisticsCost,
    managerIncluded,
    assistantsCount,
    inventory.estimatedCost,
    profitWarningThreshold,
  )

  return (
    <div
      className={`rounded-xl p-5 border ${
        profitability.isWarning
          ? 'bg-red-50 border-red-200'
          : 'bg-green-50 border-green-200'
      }`}
    >
      <div className="flex items-center gap-2 mb-4">
        <span className="text-lg">{profitability.isWarning ? '🚨' : '💰'}</span>
        <h3 className="font-semibold text-gray-900">רווחיות פנימית</h3>
        {profitability.isWarning && (
          <span className="text-xs bg-red-500 text-white px-2 py-0.5 rounded-full">
            אזהרה!
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-gray-700">
          <span>הכנסה מלקוח</span>
          <span className="font-medium">{formatNIS(totalCustomerPrice)}</span>
        </div>
        <div className="border-t border-dashed my-2" />
        {managerIncluded && (
          <div className="flex justify-between text-gray-600">
            <span>מנהל אירוע</span>
            <span>−{formatNIS(MANAGER_COST)}</span>
          </div>
        )}
        {assistantsCount > 0 && (
          <div className="flex justify-between text-gray-600">
            <span>עוזרים ({assistantsCount}×₪{ASSISTANT_COST})</span>
            <span>−{formatNIS(profitability.assistantsCost)}</span>
          </div>
        )}
        <div className="flex justify-between text-gray-600">
          <span>לוגיסטיקה</span>
          <span>−{formatNIS(logisticsCost)}</span>
        </div>
        <div className="flex justify-between text-gray-600">
          <span>גלידה ({inventory.basketasRequired} בסקטות)</span>
          <span>−{formatNIS(inventory.estimatedCost)}</span>
        </div>
        <div className="flex justify-between font-bold text-base border-t pt-2">
          <span>רווח נקי</span>
          <span
            className={profitability.isWarning ? 'text-red-600' : 'text-green-700'}
          >
            {formatNIS(profitability.netProfit)}
          </span>
        </div>
      </div>

      {profitability.isWarning && (
        <div className="mt-3 text-xs text-red-700 bg-red-100 rounded-lg px-3 py-2">
          הרווח נמוך מ-{formatNIS(profitWarningThreshold)}. בדוק את התמחור לפני סגירה.
        </div>
      )}
    </div>
  )
}
