import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function PATCH(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const settings = await request.json() as Record<string, string>

  await Promise.all(
    Object.entries(settings).map(([key, value]) =>
      db.settings.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  )

  return NextResponse.json({ ok: true })
}
