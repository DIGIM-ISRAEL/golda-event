import { NextResponse, type NextRequest } from 'next/server'
import { verifyToken } from '@/lib/auth'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // /api/admin/sync-flavors מאמת בעצמו (סשן אדמין או CRON_SECRET) — כמו /api/cron
  // /checklist ו-/api/checklist נגישים דרך טוקן ייחודי (לעובד בשטח, בלי התחברות)
  const publicPaths = ['/login', '/approve', '/checklist', '/api/auth', '/api/approve', '/api/checklist', '/api/setup', '/api/cron', '/api/admin/sync-flavors', '/brand']
  const isPublic = publicPaths.some((p) => pathname.startsWith(p))

  const token = request.cookies.get('session')?.value
  const session = token ? await verifyToken(token) : null

  if (!session && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (session && pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
