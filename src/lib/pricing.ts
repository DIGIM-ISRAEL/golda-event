import {
  INSTITUTIONAL_BASE_PRICE,
  INSTITUTIONAL_BASE_PARTICIPANTS,
  INSTITUTIONAL_EXTRA_PER_PERSON,
  PRIVATE_BASE_PER_PERSON,
  VAT_RATE,
} from '@/lib/constants'
import type { ClientType, Extra, DiscountType, PricingResult } from '@/lib/types'

interface PricingInput {
  clientType: ClientType
  participants: number
  logisticsCost: number
  extras: Extra[]
  discountType: DiscountType | null
  discountValue: number
  advancePaid: number
  priceOverride?: number | null
  pricePerPersonOverride?: number | null
}

export function calculatePrice(input: PricingInput): PricingResult {
  const {
    clientType,
    participants,
    logisticsCost,
    extras,
    discountType,
    discountValue,
    advancePaid,
    priceOverride,
    pricePerPersonOverride,
  } = input

  let basePrice = 0
  let extraParticipantsPrice = 0

  if (clientType === 'institutional') {
    basePrice = INSTITUTIONAL_BASE_PRICE
    if (participants > INSTITUTIONAL_BASE_PARTICIPANTS) {
      extraParticipantsPrice =
        (participants - INSTITUTIONAL_BASE_PARTICIPANTS) * INSTITUTIONAL_EXTRA_PER_PERSON
    }
  } else {
    // Private client
    if (priceOverride != null) {
      basePrice = priceOverride
    } else {
      const perPerson = pricePerPersonOverride ?? PRIVATE_BASE_PER_PERSON
      basePrice = participants * perPerson
    }
  }

  const subtotal = basePrice + extraParticipantsPrice
  const extrasTotal = extras.reduce((sum, e) => sum + e.amount, 0)

  let discountAmount = 0
  if (discountType === 'percent' && discountValue > 0) {
    discountAmount = subtotal * (discountValue / 100)
  } else if (discountType === 'fixed' && discountValue > 0) {
    discountAmount = discountValue
  }

  const priceAfterDiscount = subtotal - discountAmount + extrasTotal + logisticsCost

  // VAT only for institutional clients
  let vatAmount: number | null = null
  let totalPrice = priceAfterDiscount

  if (clientType === 'institutional') {
    vatAmount = priceAfterDiscount * VAT_RATE
    totalPrice = priceAfterDiscount + vatAmount
  }

  const balanceDue = totalPrice - advancePaid

  return {
    basePrice,
    extraParticipantsPrice,
    subtotal,
    vatAmount,
    logisticsCost,
    extrasTotal,
    discountAmount,
    totalBeforeAdvance: totalPrice,
    advancePaid,
    balanceDue,
    totalPrice,
  }
}

export function formatNIS(amount: number): string {
  return `₪${amount.toLocaleString('he-IL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}
