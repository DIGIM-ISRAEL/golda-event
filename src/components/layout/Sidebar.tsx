'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Menu, X, LogOut } from 'lucide-react'
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
  { href: '/admin/users', label: 'משתמשים', icon: '👥' },
  { href: '/admin/settings', label: 'הגדרות', icon: '⚙️' },
]

export default function Sidebar({ role, userName }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  function renderNavLink(item: { href: string; label: string; icon: string }) {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          active ? 'bg-blue-50 text-blue-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
        )}
      >
        <span>{item.icon}</span>
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <>
      {/* סרגל עליון למובייל */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -mr-2 text-gray-600 hover:text-gray-900"
          aria-label="פתח תפריט"
        >
          <Menu size={22} />
        </button>
        <div className="flex items-center gap-2">
          <span className="font-bold text-gray-900 text-sm">גולדה אירועים</span>
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-sm">G</span>
          </div>
        </div>
      </div>

      {/* רקע כהה מאחורי ה-drawer במובייל */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* סרגל צד — קבוע בדסקטופ, נשלף במובייל */}
      <aside
        className={cn(
          'bg-white border-l border-gray-200 flex flex-col z-50',
          'md:w-60 md:sticky md:top-0 md:h-screen md:translate-x-0',
          'fixed top-0 bottom-0 right-0 w-64 transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        )}
      >
        <div className="px-6 py-5 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <div>
              <div className="font-bold text-gray-900 text-sm">גולדה אירועים</div>
              <div className="text-xs text-gray-500">מערכת ניהול</div>
            </div>
          </div>
          {/* כפתור סגירה — מובייל בלבד */}
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-gray-400 hover:text-gray-600"
            aria-label="סגור תפריט"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">{navItems.map(renderNavLink)}</div>

          {role === 'admin' && (
            <div className="mt-6">
              <div className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">ניהול</div>
              <div className="space-y-1">{adminItems.map(renderNavLink)}</div>
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
            <button onClick={handleLogout} className="text-gray-400 hover:text-gray-600" title="יציאה">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
