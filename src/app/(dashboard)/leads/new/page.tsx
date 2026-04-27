import { db } from '@/lib/db'
import LeadForm from '@/components/leads/LeadForm'

export default async function NewLeadPage() {
  const [flavors, locations, settingsRows] = await Promise.all([
    db.flavor.findMany({ orderBy: [{ category: 'asc' as const }, { sortOrder: 'asc' as const }] }),
    db.location.findMany({ orderBy: { cityName: 'asc' as const } }),
    db.settings.findMany(),
  ])

  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))
  const basketaCost = Number(settingsMap['basketa_cost_nis'] ?? 150)

  const flavorsForForm = flavors.map((f) => ({
    id: f.id, name: f.name, category: f.category,
    is_in_stock: f.isInStock, sort_order: f.sortOrder, created_at: f.createdAt.toISOString(),
  }))

  const locationsForForm = locations.map((l) => ({
    id: l.id, city_name: l.cityName, travel_cost_nis: l.travelCostNis, created_at: l.createdAt.toISOString(),
  }))

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">ליד חדש</h1>
      </div>
      <LeadForm flavors={flavorsForForm} locations={locationsForForm} basketaCostNis={basketaCost} />
    </div>
  )
}
