'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { Role } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SidebarProps {
  role: Role
  userName: string
}

const navItems = [
  { href: '/dashboard', label: 'לוח בקרה', icon: '📊' },
  { href: '/leads', label: 'לידים', icon: '📋' },
  { href: '/calendar', label: 'לוח שנה', icon: '📅' },
  { href: '/flavors', label: 'טעמים', icon: '🍦' },
  { href: '/locations', label: 'מיקומים', icon: '📍' },
]

const adminItems = [
  { href: '/admin', label: 'רווחיות', icon: '💰' },
  { href: '/admin/settings', label: 'הגדרות', icon: '⚙️' },
]

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="w-60 bg-white border-l border-gray-200 flex flex-col h-screen sticky top-0">
      <div className="px-6 py-5 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
            <span className="text-white font-bold text-sm">G</span>
          </div>
          <div>
            <div className="font-bold text-gray-900 text-sm">גולדה אירועים</div>
            <div className="text-xs text-gray-500">מערכת ניהול</div>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        <div className="space-y-1">
          {navItems.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            )
          })}
        </div>

        {role === 'admin' && (
          <div className="mt-6">
            <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">ניהול</div>
            <div className="space-y-1">
              {adminItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + '/')
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                      active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                    )}
                  >
                    <span>{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-gray-50">
          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
            <span className="text-blue-700 text-xs font-bold">{userName.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-gray-900 truncate">{userName}</div>
            <div className="text-xs text-gray-500">{role === 'admin' ? 'מנהל' : 'איש מכירות'}</div>
          </div>
          <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600 text-xs" title="יציאה">
            ↩
          </button>
        </div>
      </div>
    </aside>
  )
}
