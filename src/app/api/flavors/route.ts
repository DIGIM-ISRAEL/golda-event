import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { name, category } = await request.json()

  const flavor = await db.flavor.create({
    data: { name, category, isInStock: true },
  })

  return NextResponse.json({
    id: flavor.id,
    name: flavor.name,
    category: flavor.category,
    is_in_stock: flavor.isInStock,
    sort_order: flavor.sortOrder,
    created_at: flavor.createdAt,
  })
}
