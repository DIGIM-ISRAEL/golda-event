import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const SUPABASE_URL = 'https://vswjenfejmixderhfjsh.supabase.co'

async function supabaseFetch(table: string, serviceKey: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=10000`, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      'Content-Type': 'application/json',
    },
  })
  if (!res.ok) throw new Error(`Supabase fetch failed for ${table}: ${res.status} ${await res.text()}`)
  return res.json()
}

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-migrate-token')
  if (!token || token !== process.env.MIGRATE_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const serviceKey = process.env.SUPABASE_SERVICE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_KEY not set' }, { status: 500 })
  }

  const log: string[] = []

  try {
    // 1. Locations
    const locations = await supabaseFetch('locations', serviceKey)
    log.push(`Fetched ${locations.length} locations`)

    for (const loc of locations) {
      await db.location.upsert({
        where: { id: loc.id },
        update: { cityName: loc.city_name, travelCostNis: loc.travel_cost_nis },
        create: { id: loc.id, cityName: loc.city_name, travelCostNis: loc.travel_cost_nis, createdAt: new Date(loc.created_at) },
      })
    }
    log.push(`✓ Locations done`)

    // 2. Flavors
    const flavors = await supabaseFetch('flavors', serviceKey)
    log.push(`Fetched ${flavors.length} flavors`)

    for (const fl of flavors) {
      await db.flavor.upsert({
        where: { id: fl.id },
        update: { name: fl.name, category: fl.category, isInStock: fl.is_in_stock, sortOrder: fl.sort_order },
        create: {
          id: fl.id,
          name: fl.name,
          category: fl.category,
          isInStock: fl.is_in_stock ?? true,
          sortOrder: fl.sort_order ?? 0,
          createdAt: new Date(fl.created_at),
        },
      })
    }
    log.push(`✓ Flavors done`)

    // 3. Settings
    const settings = await supabaseFetch('settings', serviceKey)
    log.push(`Fetched ${settings.length} settings`)

    for (const s of settings) {
      await db.settings.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value },
      })
    }
    log.push(`✓ Settings done`)

    // 4. Leads (sales_rep_id → null, FK to profiles which don't exist in new system)
    const leads = await supabaseFetch('leads', serviceKey)
    log.push(`Fetched ${leads.length} leads`)

    for (const lead of leads) {
      await db.lead.upsert({
        where: { id: lead.id },
        update: {
          clientName: lead.client_name,
          clientPhone: lead.client_phone,
          clientType: lead.client_type,
          eventType: lead.event_type,
          eventDate: String(lead.event_date),
          startTime: String(lead.start_time),
          endTime: String(lead.end_time),
          locationId: lead.location_id ?? null,
          participants: lead.participants,
          status: lead.status,
          notes: lead.notes ?? null,
          managerIncluded: lead.manager_included ?? true,
          assistantsCount: lead.assistants_count ?? 0,
          priceOverride: lead.price_override ?? null,
          pricePerPersonOverride: lead.price_per_person_override ?? null,
          clientApprovedAt: lead.client_approved_at ? new Date(lead.client_approved_at) : null,
          clientApprovedName: lead.client_approved_name ?? null,
          googleEventId: lead.google_event_id ?? null,
          salesRepId: null, // profiles UUIDs don't map to new users
        },
        create: {
          id: lead.id,
          clientName: lead.client_name,
          clientPhone: lead.client_phone,
          clientType: lead.client_type,
          eventType: lead.event_type,
          eventDate: String(lead.event_date),
          startTime: String(lead.start_time),
          endTime: String(lead.end_time),
          locationId: lead.location_id ?? null,
          participants: lead.participants,
          status: lead.status,
          notes: lead.notes ?? null,
          managerIncluded: lead.manager_included ?? true,
          assistantsCount: lead.assistants_count ?? 0,
          priceOverride: lead.price_override ?? null,
          pricePerPersonOverride: lead.price_per_person_override ?? null,
          signatureToken: lead.signature_token ?? undefined,
          clientApprovedAt: lead.client_approved_at ? new Date(lead.client_approved_at) : null,
          clientApprovedName: lead.client_approved_name ?? null,
          googleEventId: lead.google_event_id ?? null,
          salesRepId: null,
          createdAt: new Date(lead.created_at),
        },
      })
    }
    log.push(`✓ Leads done (salesRepId set to null)`)

    // 5. Lead Flavors
    const leadFlavors = await supabaseFetch('lead_flavors', serviceKey)
    log.push(`Fetched ${leadFlavors.length} lead_flavors`)

    for (const lf of leadFlavors) {
      // Only insert if both lead and flavor exist
      const leadExists = await db.lead.findUnique({ where: { id: lf.lead_id }, select: { id: true } })
      const flavorExists = await db.flavor.findUnique({ where: { id: lf.flavor_id }, select: { id: true } })
      if (!leadExists || !flavorExists) continue

      await db.leadFlavor.upsert({
        where: { leadId_flavorId: { leadId: lf.lead_id, flavorId: lf.flavor_id } },
        update: {},
        create: { leadId: lf.lead_id, flavorId: lf.flavor_id },
      })
    }
    log.push(`✓ LeadFlavors done`)

    // 6. Quotes
    const quotes = await supabaseFetch('quotes', serviceKey)
    log.push(`Fetched ${quotes.length} quotes`)

    for (const q of quotes) {
      const leadExists = await db.lead.findUnique({ where: { id: q.lead_id }, select: { id: true } })
      if (!leadExists) continue

      await db.quote.upsert({
        where: { id: q.id },
        update: {
          basePrice: q.base_price,
          vatAmount: q.vat_amount ?? null,
          logisticsCost: q.logistics_cost,
          extras: q.extras ?? [],
          discountType: q.discount_type ?? null,
          discountValue: q.discount_value ?? 0,
          advancePaid: q.advance_paid ?? 0,
          balanceDue: q.balance_due,
          totalPrice: q.total_price,
        },
        create: {
          id: q.id,
          leadId: q.lead_id,
          basePrice: q.base_price,
          vatAmount: q.vat_amount ?? null,
          logisticsCost: q.logistics_cost,
          extras: q.extras ?? [],
          discountType: q.discount_type ?? null,
          discountValue: q.discount_value ?? 0,
          advancePaid: q.advance_paid ?? 0,
          balanceDue: q.balance_due,
          totalPrice: q.total_price,
          createdAt: new Date(q.created_at),
        },
      })
    }
    log.push(`✓ Quotes done`)

    return NextResponse.json({ ok: true, log })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ ok: false, error: message, log }, { status: 500 })
  }
}
