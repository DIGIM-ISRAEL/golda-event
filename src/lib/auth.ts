import { SignJWT, jwtVerify } from 'jose'

const key = new TextEncoder().encode(process.env.JWT_SECRET!)

export interface SessionPayload {
  userId: string
  email: string
  role: 'admin' | 'sales'
  name: string
  phoneNumber?: string | null
}

export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('7d')
    .sign(key)
}

export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}
