import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import LeadForm from '@/components/leads/LeadForm'

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [lead, flavors, locations, settingsRows] = await Promise.all([
    db.lead.findUnique({
      where: { id },
      include: {
        location: true,
        quote: true,
        flavors: { include: { flavor: true } },
      },
    }),
    db.flavor.findMany({ orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }] }),
    db.location.findMany({ orderBy: { cityName: 'asc' } }),
    db.settings.findMany(),
  ])

  if (!lead) notFound()

  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))
  const basketaCost = Number(settingsMap['basketa_cost_nis'] ?? 150)

  const flavorsForForm = flavors.map((f) => ({
    id: f.id, name: f.name, category: f.category,
    is_in_stock: f.isInStock, sort_order: f.sortOrder, created_at: f.createdAt.toISOString(),
  }))

  const locationsForForm = locations.map((l) => ({
    id: l.id, city_name: l.cityName, travel_cost_nis: l.travelCostNis, created_at: l.createdAt.toISOString(),
  }))

  const leadForForm = {
    id: lead.id,
    client_name: lead.clientName,
    client_phone: lead.clientPhone,
    client_type: lead.clientType,
    event_type: lead.eventType,
    event_date: lead.eventDate,
    start_time: lead.startTime,
    end_time: lead.endTime,
    location_id: lead.locationId,
    participants: lead.participants,
    status: lead.status,
    notes: lead.notes,
    manager_included: lead.managerIncluded,
    assistants_count: lead.assistantsCount,
    price_override: lead.priceOverride,
    price_per_person_override: lead.pricePerPersonOverride,
    included_items: lead.includedItems,
    flavors: lead.flavors.map((lf) => ({
      id: lf.flavor.id, name: lf.flavor.name, category: lf.flavor.category,
      is_in_stock: lf.flavor.isInStock, sort_order: lf.flavor.sortOrder, created_at: lf.flavor.createdAt.toISOString(),
    })),
    quote: lead.quote ? {
      id: lead.quote.id,
      lead_id: lead.quote.leadId,
      base_price: lead.quote.basePrice,
      vat_amount: lead.quote.vatAmount,
      logistics_cost: lead.quote.logisticsCost,
      extras: lead.quote.extras,
      discount_type: lead.quote.discountType,
      discount_value: lead.quote.discountValue,
      advance_paid: lead.quote.advancePaid,
      balance_due: lead.quote.balanceDue,
      total_price: lead.quote.totalPrice,
      created_at: lead.quote.createdAt.toISOString(),
      updated_at: lead.quote.updatedAt.toISOString(),
    } : undefined,
  }

  return (
    <div>
      <div className="bg-white border-b border-brand-line px-6 py-4">
        <h1 className="text-xl font-bold text-brand-ink">עריכת ליד — {lead.clientName}</h1>
      </div>
      <LeadForm lead={leadForForm as Parameters<typeof LeadForm>[0]['lead']} flavors={flavorsForForm} locations={locationsForForm} basketaCostNis={basketaCost} />
    </div>
  )
}
