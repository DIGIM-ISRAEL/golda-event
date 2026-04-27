import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import SettingsForm from '@/components/admin/SettingsForm'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'admin') redirect('/dashboard')

  const { data: settings } = await supabase.from('settings').select('*')
  const settingsMap = Object.fromEntries(
    (settings ?? []).map((s: { key: string; value: string }) => [s.key, s.value]),
  )

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">הגדרות מערכת</h1>
      <SettingsForm
        profitWarningThreshold={Number(settingsMap['profit_warning_threshold'] ?? 1000)}
        basketaCostNis={Number(settingsMap['basketa_cost_nis'] ?? 150)}
      />
    </div>
  )
}
