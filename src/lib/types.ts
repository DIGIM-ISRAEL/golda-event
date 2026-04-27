export type Role = 'admin' | 'sales'
export type ClientType = 'institutional' | 'private'
export type EventType = 'dairy' | 'parve'
export type LeadStatus = 'lead' | 'quote_sent' | 'closed' | 'done' | 'canceled'
export type FlavorCategory = 'dairy' | 'parve'
export type DiscountType = 'percent' | 'fixed'

export interface Profile {
  id: string
  full_name: string
  role: Role
  created_at: string
}

export interface Location {
  id: string
  city_name: string
  travel_cost_nis: number
  created_at: string
}

export interface Flavor {
  id: string
  name: string
  category: FlavorCategory
  is_in_stock: boolean
  sort_order: number
  created_at: string
}

export interface Extra {
  label: string
  amount: number
}

export interface Lead {
  id: string
  client_name: string
  client_phone: string
  client_type: ClientType
  event_type: EventType
  event_date: string
  start_time: string
  end_time: string
  location_id: string | null
  participants: number
  status: LeadStatus
  sales_rep_id: string | null
  notes: string | null
  manager_included: boolean
  assistants_count: number
  price_override: number | null
  price_per_person_override: number | null
  signature_token: string
  client_approved_at: string | null
  client_approved_name: string | null
  google_event_id: string | null
  created_at: string
  updated_at: string
  // Joined
  location?: Location
  flavors?: Flavor[]
  quote?: Quote
  sales_rep?: Profile
}

export interface Quote {
  id: string
  lead_id: string
  base_price: number
  vat_amount: number | null
  logistics_cost: number
  extras: Extra[]
  discount_type: DiscountType | null
  discount_value: number
  advance_paid: number
  balance_due: number
  total_price: number
  created_at: string
  updated_at: string
}

export interface Settings {
  profit_warning_threshold: number
  basketa_cost_nis: number
}

export interface PricingResult {
  basePrice: number
  extraParticipantsPrice: number
  subtotal: number
  vatAmount: number | null
  logisticsCost: number
  extrasTotal: number
  discountAmount: number
  totalBeforeAdvance: number
  advancePaid: number
  balanceDue: number
  totalPrice: number
}

export interface ProfitabilityResult {
  managerCost: number
  assistantsCost: number
  logisticsCost: number
  iceCreamCost: number
  totalCost: number
  netProfit: number
  isWarning: boolean
}

export interface InventoryResult {
  participants: number
  gramsNeeded: number
  basketasRequired: number
  estimatedCost: number
}

export interface ConflictCheckResult {
  hasHardConflict: boolean
  hasSoftConflict: boolean
  conflictingLead?: Lead
  sameDayLeads?: Lead[]
}
