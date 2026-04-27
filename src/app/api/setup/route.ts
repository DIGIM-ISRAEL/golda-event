import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const { token, email, password, name } = await request.json()

  if (!token || token !== process.env.SETUP_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const userCount = await db.user.count()
  if (userCount > 0) {
    return NextResponse.json({ error: 'Setup already completed' }, { status: 409 })
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await db.user.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      fullName: name ?? 'רון',
      role: 'admin',
    },
  })

  return NextResponse.json({ ok: true, id: user.id, email: user.email })
}
