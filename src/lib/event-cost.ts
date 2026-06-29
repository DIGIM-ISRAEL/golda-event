import { GRAMS_PER_PORTION, GRAMS_PER_BASKETA, DEFAULT_SUPPLIES, type SupplyItem } from '@/lib/constants'

// קריאת רשימת כלי ההגשה מההגדרות (JSON), עם נפילה רכה לברירת המחדל.
export function parseSupplies(raw: string | undefined | null): SupplyItem[] {
  if (!raw) return DEFAULT_SUPPLIES
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const clean = parsed
        .filter(
          (s): s is SupplyItem =>
            s && typeof s.label === 'string' && typeof s.unitCost === 'number' && typeof s.qtyPerParticipant === 'number',
        )
        .map((s) => ({ label: s.label.trim(), unitCost: s.unitCost, qtyPerParticipant: s.qtyPerParticipant }))
        .filter((s) => s.label && s.unitCost >= 0 && s.qtyPerParticipant >= 0)
      return clean // מותר ריק — אם המשתמש מחק הכל, אין עלות כלים
    }
  } catch {
    /* JSON פגום — ברירת מחדל */
  }
  return DEFAULT_SUPPLIES
}

// יומן האירוע — נשמר בשדה lead.eventLog (JSON). הכל אופציונלי:
// ליד בלי eventLog מתנהג כמו "הכל יצא, כלום לא חזר" (ברירת מחדל = התנהגות היום).
export interface EventLog {
  basketasOut?: Record<string, number> // כמה בסקטות יצאו, פר flavorId
  returnedKg?: Record<string, number> // כמה ק"ג חזרו (שקילה), פר flavorId
  basketasReturned?: Record<string, number> // legacy — בסקטות שלמות שחזרו (תאימות אחורה)
  returnedAt?: string // ISO — מתי תועדו ההחזרות
}

// משקל בסקטה אחת בק"ג (4.5)
export const KG_PER_BASKETA = GRAMS_PER_BASKETA / 1000

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
  out: number // בסקטות שיצאו
  outKg: number // משקל שיצא (out × 4.5)
  returnedKg: number // משקל שחזר (שקילה)
  consumedKg: number // outKg − returnedKg
  outCost: number
  returnCredit: number // יחסי למשקל שחזר
  netCost: number
}

export interface EventCostResult {
  flavorLines: EventFlavorLine[]
  basketasRequired: number
  iceCreamOut: number
  iceCreamReturn: number
  iceCreamNet: number
  utensilsCost: number
  utensilLines: { label: string; qty: number; unitCost: number; cost: number }[]
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
  supplies?: SupplyItem[]
}): EventCostResult {
  const { flavors, participants, fallbackBasketaCost, eventLog } = params
  const supplies = params.supplies ?? DEFAULT_SUPPLIES
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
    const outKg = out * KG_PER_BASKETA

    // משקל שחזר: עדיפות לשקילה (returnedKg); תאימות אחורה לבסקטות שלמות שנספרו פעם
    let returnedKg = eventLog?.returnedKg?.[f.id]
    if (returnedKg == null && eventLog?.basketasReturned?.[f.id] != null) {
      returnedKg = eventLog.basketasReturned[f.id] * KG_PER_BASKETA
    }
    returnedKg = Math.max(0, Math.min(returnedKg ?? 0, outKg))
    if (returnedKg > 0) anyReturn = true

    const consumedKg = outKg - returnedKg
    const unitCostPerKg = unitCost / KG_PER_BASKETA
    const outCost = out * unitCost
    const returnCredit = returnedKg * unitCostPerKg
    iceCreamOut += outCost
    iceCreamReturn += returnCredit
    return {
      id: f.id,
      name: f.name,
      unitCost,
      estimated: !hasCost,
      out,
      outKg,
      returnedKg,
      consumedKg,
      outCost,
      returnCredit,
      netCost: outCost - returnCredit,
    }
  })

  const utensilLines = supplies.map((u) => {
    const qty = Math.round(participants * u.qtyPerParticipant)
    return { label: u.label, qty, unitCost: u.unitCost, cost: qty * u.unitCost }
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
