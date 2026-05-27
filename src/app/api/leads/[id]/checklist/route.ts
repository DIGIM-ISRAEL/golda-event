import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { checkedItems } = await request.json()

  if (!Array.isArray(checkedItems)) {
    return NextResponse.json({ error: 'Invalid checkedItems' }, { status: 400 })
  }

  await db.lead.update({
    where: { id },
    data: { checkedItems },
  })

  return NextResponse.json({ ok: true })
}
