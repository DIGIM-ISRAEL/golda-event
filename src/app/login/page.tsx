'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import GoldaLockup from '@/components/brand/GoldaLockup'
import StripeBar from '@/components/brand/StripeBar'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })

    if (!res.ok) {
      const data = await res.json()
      setError(data.error ?? 'אימייל או סיסמה שגויים')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div dir="rtl" className="brand-aurora relative min-h-screen flex items-center justify-center p-4 overflow-hidden">
      <div className="relative w-full max-w-md">
        <div className="brand-card overflow-hidden">
          <StripeBar height={6} />
          <div className="px-8 pt-10 pb-9">
            <div className="flex flex-col items-center">
              <GoldaLockup size={120} tagline />
              <div className="mt-6 flex items-center gap-3 w-full max-w-[14rem]">
                <span className="h-px flex-1 bg-brand-line" />
                <span className="text-[11px] tracking-[0.25em] text-brand-muted whitespace-nowrap">מערכת ניהול פנימית</span>
                <span className="h-px flex-1 bg-brand-line" />
              </div>
            </div>

            <form onSubmit={handleLogin} className="mt-8 space-y-5">
              <div>
                <label className="block text-sm font-medium text-brand-ink mb-1.5">אימייל</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full rounded-xl border border-brand-line bg-white px-4 py-3 text-sm text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 transition"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-brand-ink mb-1.5">סיסמה</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  dir="ltr"
                  className="w-full rounded-xl border border-brand-line bg-white px-4 py-3 text-sm text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 transition"
                  placeholder="••••••••"
                />
              </div>

              {error && (
                <div className="rounded-xl bg-brand-peach/25 border border-brand-peach/60 text-brand-maroon px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-brand-maroon text-brand-cream py-3.5 font-semibold text-sm tracking-wide hover:bg-brand-maroon-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {loading ? 'מתחבר…' : 'כניסה למערכת'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-[11px] text-brand-muted/80 mt-5 tracking-[0.15em]">
          גלידה ישראלית · גולדה אירועים
        </p>
      </div>
    </div>
  )
}
