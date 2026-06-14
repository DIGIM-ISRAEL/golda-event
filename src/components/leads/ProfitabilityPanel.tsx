'use client'

import { Banknote, TriangleAlert } from 'lucide-react'
import { calculateInventory, calculateProfitability, effectiveBasketaCost } from '@/lib/inventory'
import { formatNIS } from '@/lib/pricing'
import { MANAGER_COST, ASSISTANT_COST } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface Props {
  totalCustomerPrice: number
  logisticsCost: number
  managerIncluded: boolean
  assistantsCount: number
  participants: number
  basketaCostNis: number
  profitWarningThreshold: number
  // עלויות הייצור של הטעמים שנבחרו — מאפשרות חישוב עלות גלידה אמיתית
  flavorCosts?: (number | null)[]
}

export default function ProfitabilityPanel({
  totalCustomerPrice,
  logisticsCost,
  managerIncluded,
  assistantsCount,
  participants,
  basketaCostNis,
  profitWarningThreshold,
  flavorCosts = [],
}: Props) {
  const effective = effectiveBasketaCost(flavorCosts, basketaCostNis)
  const inventory = calculateInventory(participants, effective.cost)
  const profitability = calculateProfitability(
    totalCustomerPrice,
    logisticsCost,
    managerIncluded,
    assistantsCount,
    inventory.estimatedCost,
    profitWarningThreshold,
  )

  const warn = profitability.isWarning

  return (
    <div
      className={cn(
        'rounded-2xl p-5 border',
        warn ? 'bg-[#FBEDE9] border-[#E6BCB2]' : 'bg-[#EAF1E3] border-[#C8DABA]',
      )}
    >
      <div className="flex items-center gap-2 mb-4">
        {warn ? (
          <TriangleAlert size={17} className="text-[#B0473A]" />
        ) : (
          <Banknote size={17} className="text-[#3D5A30]" />
        )}
        <h3 className="font-serif font-semibold text-brand-ink">רווחיות פנימית</h3>
        {warn && (
          <span className="text-xs bg-[#B0473A] text-white px-2 py-0.5 rounded-full">אזהרה!</span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex justify-between text-brand-ink/80">
          <span>הכנסה מלקוח</span>
          <span className="font-medium" dir="ltr">{formatNIS(totalCustomerPrice)}</span>
        </div>
        <div className="border-t border-dashed border-brand-line/80 my-2" />
        {managerIncluded && (
          <div className="flex justify-between text-brand-muted">
            <span>מנהל אירוע</span>
            <span dir="ltr">−{formatNIS(MANAGER_COST)}</span>
          </div>
        )}
        {assistantsCount > 0 && (
          <div className="flex justify-between text-brand-muted">
            <span>עוזרים ({assistantsCount}×₪{ASSISTANT_COST})</span>
            <span dir="ltr">−{formatNIS(profitability.assistantsCost)}</span>
          </div>
        )}
        <div className="flex justify-between text-brand-muted">
          <span>לוגיסטיקה</span>
          <span dir="ltr">−{formatNIS(logisticsCost)}</span>
        </div>
        <div className="flex justify-between text-brand-muted">
          <span>גלידה ({inventory.basketasRequired} בסקטות × ₪{Math.round(effective.cost)})</span>
          <span dir="ltr">−{formatNIS(inventory.estimatedCost)}</span>
        </div>
        <div className="text-[11px] text-brand-muted/80 -mt-1">
          {effective.fromFlavors
            ? 'עלות בסקטה לפי ממוצע הטעמים שנבחרו (מאקסל העלויות)'
            : 'עלות בסקטה לפי ברירת המחדל — בחר טעמים לחישוב מדויק'}
        </div>
        <div className="flex justify-between items-baseline font-bold border-t border-brand-line/70 pt-2">
          <span className="text-brand-ink">רווח נקי</span>
          <span
            dir="ltr"
            className={cn('font-serif text-lg', warn ? 'text-[#B0473A]' : 'text-[#3D5A30]')}
          >
            {formatNIS(profitability.netProfit)}
          </span>
        </div>
      </div>

      {warn && (
        <div className="mt-3 text-xs text-[#8F3527] bg-[#F6DDD6] rounded-lg px-3 py-2">
          הרווח נמוך מ-{formatNIS(profitWarningThreshold)}. בדוק את התמחור לפני סגירה.
        </div>
      )}
    </div>
  )
}
