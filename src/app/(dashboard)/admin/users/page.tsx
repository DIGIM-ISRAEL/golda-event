import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import UsersClient from '@/components/users/UsersClient'

export const dynamic = 'force-dynamic'

export default async function UsersPage() {
  const session = await getSession()
  if (!session || session.role !== 'admin') redirect('/dashboard')

  const users = await db.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, phoneNumber: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return <UsersClient initialUsers={users} currentUserId={session.userId} />
}
