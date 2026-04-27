import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FlavorManager from '@/components/flavors/FlavorManager'

export default async function FlavorsPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [{ data: profile }, { data: flavors }] = await Promise.all([
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('flavors').select('*').order('category').order('sort_order'),
  ])

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ניהול טעמים</h1>
      <FlavorManager flavors={flavors ?? []} role={profile?.role ?? 'sales'} />
    </div>
  )
}
