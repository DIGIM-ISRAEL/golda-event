import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeadForm from '@/components/leads/LeadForm'

export default async function NewLeadPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: flavors }, { data: locations }, { data: settings }] =
    await Promise.all([
      supabase.from('profiles').select('role').eq('id', user.id).single(),
      supabase.from('flavors').select('*').order('category').order('sort_order'),
      supabase.from('locations').select('*').order('city_name'),
      supabase.from('settings').select('*'),
    ])

  const basketaCost = Number(
    settings?.find((s: { key: string; value: string }) => s.key === 'basketa_cost_nis')?.value ?? 150,
  )

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">ליד חדש</h1>
      </div>
      <LeadForm
        flavors={flavors ?? []}
        locations={locations ?? []}
        role={profile?.role ?? 'sales'}
        basketaCostNis={basketaCost}
      />
    </div>
  )
}
