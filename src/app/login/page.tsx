'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import PalmLogo from '@/components/brand/PalmLogo'

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
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-brand-mint to-brand-cream flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 border border-brand-tan/40">
        <div className="text-center mb-8">
          <div className="text-brand-gold flex justify-center mb-2">
            <PalmLogo size={56} />
          </div>
          <h1 className="font-serif text-4xl font-bold text-brand-gold tracking-[0.2em] mr-[0.2em]">GOLDA</h1>
          <p className="text-brand-gold/70 text-[10px] tracking-[0.25em] mt-1">WE MAKE FABULOUS GELATO</p>
          <p className="text-brand-maroon mt-4 text-sm font-medium">מערכת ניהול פנימית</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-brand-maroon mb-1">אימייל</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              placeholder="example@email.com"
              dir="ltr"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-maroon mb-1">סיסמה</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold focus:border-transparent"
              placeholder="••••••••"
              dir="ltr"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-maroon text-white rounded-lg py-3 font-semibold text-sm hover:bg-brand-maroon-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'מתחבר...' : 'כניסה למערכת'}
          </button>
        </form>
      </div>
    </div>
  )
}
