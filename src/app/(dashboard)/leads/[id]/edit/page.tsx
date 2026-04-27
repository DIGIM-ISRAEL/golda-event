import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import LeadForm from '@/components/leads/LeadForm'

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: lead },
    { data: profile },
    { data: flavors },
    { data: locations },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select('*, location:locations(*), flavors:lead_flavors(flavor:flavors(*)), quote:quotes(*)')
      .eq('id', id)
      .single(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('flavors').select('*').order('category').order('sort_order'),
    supabase.from('locations').select('*').order('city_name'),
    supabase.from('settings').select('*'),
  ])

  if (!lead) notFound()

  const basketaCost = Number(
    settings?.find((s: { key: string }) => s.key === 'basketa_cost_nis')?.value ?? 150,
  )

  // Normalize lead for form
  const normalizedLead = {
    ...lead,
    flavors: lead.flavors?.map((f: { flavor: unknown }) => f.flavor) ?? [],
    quote: Array.isArray(lead.quote) ? lead.quote[0] : lead.quote,
  }

  return (
    <div>
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <h1 className="text-xl font-bold text-gray-900">עריכת ליד — {lead.client_name}</h1>
      </div>
      <LeadForm
        lead={normalizedLead}
        flavors={flavors ?? []}
        locations={locations ?? []}
        role={profile?.role ?? 'sales'}
        basketaCostNis={basketaCost}
      />
    </div>
  )
}
