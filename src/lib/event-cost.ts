import { GRAMS_PER_PORTION, GRAMS_PER_BASKETA, UTENSIL_COSTS } from '@/lib/constants'

// יומן האירוע — נשמר בשדה lead.eventLog (JSON). הכל אופציונלי:
// ליד בלי eventLog מתנהג כמו "הכל יצא, כלום לא חזר" (ברירת מחדל = התנהגות היום).
export interface EventLog {
  basketasOut?: Record<string, number> // כמה בסקטות יצאו, פר flavorId
  basketasReturned?: Record<string, number> // כמה חזרו שלמות, פר flavorId
  returnedAt?: string // ISO — מתי תועדו ההחזרות
}

export interface FlavorCostInfo {
  id: string
  name: string
  costPerBasketa: number | null
}

export interface EventFlavorLine {
  id: string
  name: string
  unitCost: number // עלות בסקטה אפקטיבית (אמיתית או fallback)
  estimated: boolean // true אם נופלים ל-fallback (אין costPerBasketa לטעם)
  out: number
  returned: number
  consumed: number // out − returned
  outCost: number
  returnCredit: number
  netCost: number
}

export interface EventCostResult {
  flavorLines: EventFlavorLine[]
  basketasRequired: number
  iceCreamOut: number
  iceCreamReturn: number
  iceCreamNet: number
  utensilsCost: number
  utensilLines: { key: string; label: string; qty: number; unitCost: number; cost: number }[]
  goodsCost: number // גלידה נטו + כלים
  hasReturns: boolean
}

export function basketasRequiredFor(participants: number): number {
  return Math.ceil((participants * GRAMS_PER_PORTION) / GRAMS_PER_BASKETA)
}

// חלוקה שווה של מספר הבסקטות בין הטעמים, עם פיזור השארית לטעמים הראשונים.
export function defaultBasketaSplit(flavorIds: string[], basketasRequired: number): Record<string, number> {
  const n = flavorIds.length
  const out: Record<string, number> = {}
  if (n === 0) return out
  const base = Math.floor(basketasRequired / n)
  let remainder = basketasRequired - base * n
  for (const id of flavorIds) {
    out[id] = base + (remainder > 0 ? 1 : 0)
    if (remainder > 0) remainder--
  }
  return out
}

// מחשב את כל פירוק עלות האירוע מתוך הטעמים + יומן האירוע.
export function computeEventCost(params: {
  flavors: FlavorCostInfo[]
  participants: number
  fallbackBasketaCost: number
  eventLog?: EventLog | null
}): EventCostResult {
  const { flavors, participants, fallbackBasketaCost, eventLog } = params
  const basketasRequired = basketasRequiredFor(participants)
  const ids = flavors.map((f) => f.id)
  const defaultOut = defaultBasketaSplit(ids, basketasRequired)

  let iceCreamOut = 0
  let iceCreamReturn = 0
  let anyReturn = false

  const flavorLines: EventFlavorLine[] = flavors.map((f) => {
    const hasCost = typeof f.costPerBasketa === 'number' && f.costPerBasketa > 0
    const unitCost = hasCost ? (f.costPerBasketa as number) : fallbackBasketaCost
    const out = eventLog?.basketasOut?.[f.id] ?? defaultOut[f.id] ?? 0
    const returned = eventLog?.basketasReturned?.[f.id] ?? 0
    if (returned > 0) anyReturn = true
    const consumed = Math.max(0, out - returned)
    const outCost = out * unitCost
    const returnCredit = returned * unitCost
    iceCreamOut += outCost
    iceCreamReturn += returnCredit
    return {
      id: f.id,
      name: f.name,
      unitCost,
      estimated: !hasCost,
      out,
      returned,
      consumed,
      outCost,
      returnCredit,
      netCost: outCost - returnCredit,
    }
  })

  const utensilLines = UTENSIL_COSTS.map((u) => {
    const qty = Math.round(participants * u.perParticipant)
    return { key: u.key, label: u.label, qty, unitCost: u.perUnit, cost: qty * u.perUnit }
  })
  const utensilsCost = utensilLines.reduce((s, u) => s + u.cost, 0)

  const iceCreamNet = iceCreamOut - iceCreamReturn

  return {
    flavorLines,
    basketasRequired,
    iceCreamOut,
    iceCreamReturn,
    iceCreamNet,
    utensilsCost,
    utensilLines,
    goodsCost: iceCreamNet + utensilsCost,
    hasReturns: anyReturn,
  }
}
