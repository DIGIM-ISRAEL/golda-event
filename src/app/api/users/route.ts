import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import bcrypt from 'bcryptjs'

export async function GET() {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const users = await db.user.findMany({
    select: { id: true, email: true, fullName: true, role: true, phoneNumber: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(users)
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session || session.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { email, password, fullName, role, phoneNumber } = await request.json()

  if (!email || !password || !fullName) {
    return NextResponse.json({ error: 'חסרים שדות חובה' }, { status: 400 })
  }

  const existing = await db.user.findUnique({ where: { email: email.toLowerCase() } })
  if (existing) {
    return NextResponse.json({ error: 'המייל כבר קיים במערכת' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      fullName,
      role: role ?? 'sales',
      phoneNumber: phoneNumber || null,
    },
    select: { id: true, email: true, fullName: true, role: true, phoneNumber: true, createdAt: true },
  })

  return NextResponse.json(user, { status: 201 })
}
