import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import AirtableLeadsClient from '@/components/leads/AirtableLeadsClient'

export const dynamic = 'force-dynamic'

export default async function AirtableLeadsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  return <AirtableLeadsClient hasPhone={!!session.phoneNumber} />
}
