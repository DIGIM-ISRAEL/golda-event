import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { signToken } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function POST(request: NextRequest) {
  const { email, password } = await request.json()

  if (!email || !password) {
    return NextResponse.json({ error: 'חסרים פרטים' }, { status: 400 })
  }

  const user = await db.user.findUnique({ where: { email: email.toLowerCase() } })

  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return NextResponse.json({ error: 'אימייל או סיסמה שגויים' }, { status: 401 })
  }

  const token = await signToken({
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.fullName,
    phoneNumber: user.phoneNumber,
  })

  const response = NextResponse.json({ ok: true })
  response.cookies.set('session', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}
