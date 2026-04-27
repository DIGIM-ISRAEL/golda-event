import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import LocationManager from '@/components/locations/LocationManager'

export default async function LocationsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const locations = await db.location.findMany({ orderBy: { cityName: 'asc' } })

  const locationsForClient = locations.map((l) => ({
    id: l.id, city_name: l.cityName, travel_cost_nis: l.travelCostNis, created_at: l.createdAt.toISOString(),
  }))

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ניהול מיקומים</h1>
      <LocationManager locations={locationsForClient} role={session.role} />
    </div>
  )
}
