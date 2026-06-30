'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Menu,
  X,
  LogOut,
  LayoutDashboard,
  ClipboardList,
  ClipboardCheck,
  PhoneCall,
  CalendarDays,
  IceCream,
  MapPin,
  Wallet,
  Users,
  Settings,
  type LucideIcon,
} from 'lucide-react'
import type { Role } from '@/lib/types'
import { cn } from '@/lib/utils'
import GoldaLockup from '@/components/brand/GoldaLockup'
import StripeBar from '@/components/brand/StripeBar'

interface SidebarProps {
  role: Role
  userName: string
}

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'לוח בקרה', icon: LayoutDashboard },
  { href: '/airtable-leads', label: 'לידים נכנסים', icon: PhoneCall },
  { href: '/leads', label: 'לידים', icon: ClipboardList },
  { href: '/event-checklists', label: 'צ\'קליסט אירועים', icon: ClipboardCheck },
  { href: '/calendar', label: 'לוח שנה', icon: CalendarDays },
  { href: '/flavors', label: 'טעמים', icon: IceCream },
  { href: '/locations', label: 'מיקומים', icon: MapPin },
]

const adminItems: NavItem[] = [
  { href: '/admin', label: 'רווחיות', icon: Wallet },
  { href: '/admin/users', label: 'משתמשים', icon: Users },
  { href: '/admin/settings', label: 'הגדרות', icon: Settings },
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

  function renderNavLink(item: NavItem) {
    const active = pathname === item.href || pathname.startsWith(item.href + '/')
    const Icon = item.icon
    return (
      <Link
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={cn(
          'group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm transition-colors',
          active
            ? 'bg-white/[0.10] text-brand-cream font-semibold'
            : 'text-brand-cream/70 hover:bg-white/[0.06] hover:text-brand-cream font-medium',
        )}
      >
        {/* מחוון פעיל — פס זהב בקצה הפנימי (שמאל ב-RTL) */}
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-brand-gold" aria-hidden />
        )}
        <Icon
          size={18}
          strokeWidth={2}
          className={cn('shrink-0 transition-colors', active ? 'text-brand-gold' : 'text-brand-cream/55 group-hover:text-brand-gold/80')}
        />
        <span>{item.label}</span>
      </Link>
    )
  }

  return (
    <>
      {/* סרגל עליון למובייל */}
      <div className="md:hidden fixed top-0 inset-x-0 z-30 h-14 bg-brand-maroon flex items-center justify-between px-4 shadow-sm">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -mr-2 text-brand-cream/80 hover:text-brand-cream"
          aria-label="פתח תפריט"
        >
          <Menu size={22} />
        </button>
        <GoldaLockup size={30} badge />
      </div>

      {/* רקע כהה מאחורי ה-drawer במובייל */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-brand-ink/50 backdrop-blur-[2px] z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* סרגל צד — בורדו פרימיום, קבוע בדסקטופ ונשלף במובייל */}
      <aside
        className={cn(
          'bg-brand-maroon flex flex-col z-50 overflow-hidden',
          'md:w-64 md:sticky md:top-0 md:h-screen md:translate-x-0',
          'fixed top-0 bottom-0 right-0 w-72 transition-transform duration-300 ease-in-out',
          mobileOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0',
        )}
      >
        {/* פס פסים — חתימת המותג */}
        <StripeBar height={4} />

        {/* לוגו */}
        <div className="px-6 pt-7 pb-6 flex items-center justify-between">
          <GoldaLockup size={56} badge />
          <button
            onClick={() => setMobileOpen(false)}
            className="md:hidden p-1 text-brand-cream/50 hover:text-brand-cream absolute top-5 left-4"
            aria-label="סגור תפריט"
          >
            <X size={20} />
          </button>
        </div>

        <div className="mx-6 mb-4 h-px bg-brand-gold/20" />

        <nav className="flex-1 px-3 overflow-y-auto">
          <div className="space-y-1">{navItems.map(renderNavLink)}</div>

          {role === 'admin' && (
            <div className="mt-7">
              <div className="px-3.5 mb-2 text-[10px] font-semibold text-brand-gold/60 uppercase tracking-[0.18em]">
                ניהול
              </div>
              <div className="space-y-1">{adminItems.map(renderNavLink)}</div>
            </div>
          )}
        </nav>

        {/* כרטיס משתמש */}
        <div className="p-3">
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.06] border border-brand-gold/15">
            <div className="w-9 h-9 rounded-full bg-brand-gold/90 flex items-center justify-center shrink-0">
              <span className="text-brand-maroon-dark text-sm font-bold">{userName.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-brand-cream truncate">{userName}</div>
              <div className="text-[11px] text-brand-cream/55">{role === 'admin' ? 'מנהל' : 'איש מכירות'}</div>
            </div>
            <button
              onClick={handleLogout}
              className="text-brand-cream/50 hover:text-brand-cream transition-colors p-1"
              title="יציאה"
              aria-label="יציאה"
            >
              <LogOut size={17} />
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
