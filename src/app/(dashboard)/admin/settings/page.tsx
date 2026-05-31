import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import SettingsForm from '@/components/admin/SettingsForm'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')

  const settingsRows = await db.settings.findMany()
  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-ink mb-6">הגדרות מערכת</h1>
      <SettingsForm
        profitWarningThreshold={Number(settingsMap['profit_warning_threshold'] ?? 1000)}
        basketaCostNis={Number(settingsMap['basketa_cost_nis'] ?? 150)}
      />
    </div>
  )
}
