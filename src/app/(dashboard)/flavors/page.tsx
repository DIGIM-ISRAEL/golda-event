import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { redirect } from 'next/navigation'
import FlavorManager from '@/components/flavors/FlavorManager'

export default async function FlavorsPage() {
  const session = await getSession()
  if (!session) redirect('/login')

  const flavors = await db.flavor.findMany({
    orderBy: [{ category: 'asc' }, { sortOrder: 'asc' }],
  })

  const flavorsForClient = flavors.map((f) => ({
    id: f.id, name: f.name, category: f.category,
    is_in_stock: f.isInStock, sort_order: f.sortOrder, created_at: f.createdAt.toISOString(),
  }))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">ניהול טעמים</h1>
      <FlavorManager flavors={flavorsForClient} role={session.role} />
    </div>
  )
}
