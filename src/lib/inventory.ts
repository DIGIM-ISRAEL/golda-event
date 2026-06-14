import { GRAMS_PER_PORTION, GRAMS_PER_BASKETA } from '@/lib/constants'
import type { InventoryResult, ProfitabilityResult } from '@/lib/types'
import { MANAGER_COST, ASSISTANT_COST } from '@/lib/constants'

// עלות בסקטה אפקטיבית — ממוצע עלויות הייצור של הטעמים שנבחרו בפועל (מהאקסל);
// כשאין לטעמים עלות (או שלא נבחרו) — נופלים לברירת המחדל מההגדרות.
export function effectiveBasketaCost(
  flavorCosts: (number | null | undefined)[],
  fallback: number,
): { cost: number; fromFlavors: boolean } {
  const known = flavorCosts.filter((c): c is number => typeof c === 'number' && c > 0)
  if (known.length === 0) return { cost: fallback, fromFlavors: false }
  return { cost: known.reduce((a, b) => a + b, 0) / known.length, fromFlavors: true }
}

export function calculateInventory(
  participants: number,
  basketaCostNis: number,
): InventoryResult {
  const gramsNeeded = participants * GRAMS_PER_PORTION
  const basketasRequired = Math.ceil(gramsNeeded / GRAMS_PER_BASKETA)
  const estimatedCost = basketasRequired * basketaCostNis

  return { participants, gramsNeeded, basketasRequired, estimatedCost }
}

export function calculateProfitability(
  totalCustomerPrice: number,
  logisticsCost: number,
  managerIncluded: boolean,
  assistantsCount: number,
  iceCreamCost: number,
  profitWarningThreshold: number,
): ProfitabilityResult {
  const managerCost = managerIncluded ? MANAGER_COST : 0
  const assistantsCost = assistantsCount * ASSISTANT_COST
  const totalCost = managerCost + assistantsCost + logisticsCost + iceCreamCost
  const netProfit = totalCustomerPrice - totalCost
  const isWarning = netProfit < profitWarningThreshold

  return {
    managerCost,
    assistantsCost,
    logisticsCost,
    iceCreamCost,
    totalCost,
    netProfit,
    isWarning,
  }
}
