import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const { name } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'שם חסר' }, { status: 400 })
  }

  const lead = await db.lead.findUnique({ where: { signatureToken: token } })

  if (!lead) {
    return NextResponse.json({ error: 'קישור לא תקף' }, { status: 404 })
  }

  await db.lead.update({
    where: { signatureToken: token },
    data: {
      clientApprovedAt: new Date(),
      clientApprovedName: name.trim(),
    },
  })

  return NextResponse.json({ ok: true })
}
