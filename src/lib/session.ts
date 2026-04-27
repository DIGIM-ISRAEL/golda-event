import { cookies } from 'next/headers'
import { verifyToken } from './auth'
import type { SessionPayload } from './auth'

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies()
  const token = cookieStore.get('session')?.value
  if (!token) return null
  return verifyToken(token)
}
