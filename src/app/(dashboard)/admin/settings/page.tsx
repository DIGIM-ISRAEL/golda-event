import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import SettingsForm from '@/components/admin/SettingsForm'
import FlavorSyncButton from '@/components/admin/FlavorSyncButton'
import WaTemplatesForm from '@/components/admin/WaTemplatesForm'
import { parseWaTemplates } from '@/lib/wa-templates'

export default async function SettingsPage() {
  const session = await getSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/dashboard')

  const settingsRows = await db.settings.findMany()
  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-brand-ink">הגדרות מערכת</h1>
      <SettingsForm
        profitWarningThreshold={Number(settingsMap['profit_warning_threshold'] ?? 1000)}
        basketaCostNis={Number(settingsMap['basketa_cost_nis'] ?? 150)}
        depositPercent={Number(settingsMap['deposit_percent'] ?? 30)}
        depositInstructions={settingsMap['deposit_instructions'] ?? ''}
        depositLink={settingsMap['deposit_link'] ?? ''}
      />
      <WaTemplatesForm initial={parseWaTemplates(settingsMap['wa_templates'])} />
      <FlavorSyncButton />
    </div>
  )
}
