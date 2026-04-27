import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params
  const { fullName, email, role, phoneNumber, password } = await request.json()

  const data: Record<string, unknown> = {}
  if (fullName) data.fullName = fullName
  if (email) data.email = email.toLowerCase()
  if (role) data.role = role
  if (phoneNumber !== undefined) data.phoneNumber = phoneNumber || null
  if (password) data.passwordHash = await bcrypt.hash(password, 12)

  const user = await db.user.update({
    where: { id },
    data,
    select: { id: true, email: true, fullName: true, role: true, phoneNumber: true, createdAt: true },
  })

  return NextResponse.json(user)
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id } = await params

  if (session.userId === id) {
    return NextResponse.json({ error: 'לא ניתן למחוק את עצמך' }, { status: 400 })
  }

  await db.user.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
