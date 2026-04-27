import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LocationManager from '@/components/locations/LocationManager'

export default async function LocationsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: locations }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('locations').select('*').order('city_name'),
  ])

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ניהול מיקומים</h1>
      <LocationManager locations={locations ?? []} role={profile?.role ?? 'sales'} />
    </div>
  )
}
