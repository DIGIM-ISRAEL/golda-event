'use client'

import { useState } from 'react'

interface Props {
  profitWarningThreshold: number
  basketaCostNis: number
}

export default function SettingsForm({ profitWarningThreshold, basketaCostNis }: Props) {
  const [threshold, setThreshold] = useState(profitWarningThreshold)
  const [basketaCost, setBasketaCost] = useState(basketaCostNis)
  const [saved, setSaved] = useState(false)

  async function save() {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profit_warning_threshold: String(threshold),
        basketa_cost_nis: String(basketaCost),
      }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-6 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)] space-y-5">
      <div>
        <label className="block text-sm font-medium text-brand-ink mb-1">סף אזהרת רווח (₪)</label>
        <p className="text-xs text-brand-muted mb-2">אם הרווח הנקי נמוך מסכום זה, תוצג אזהרה אדומה</p>
        <input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full border border-brand-line bg-brand-cream/50 text-brand-ink rounded-xl px-3 py-2.5 text-sm focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-brand-ink mb-1">עלות בסקטה (₪)</label>
        <p className="text-xs text-brand-muted mb-2">עלות בסקטת גלידה אחת (4.5 ק&quot;ג) לחישוב עלות המלאי</p>
        <input
          type="number"
          value={basketaCost}
          onChange={(e) => setBasketaCost(Number(e.target.value))}
          className="w-full border border-brand-line bg-brand-cream/50 text-brand-ink rounded-xl px-3 py-2.5 text-sm focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button onClick={save} className="bg-brand-maroon text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-maroon-dark">
          שמור הגדרות
        </button>
        {saved && <span className="text-[#4A6B41] text-sm font-medium">✓ נשמר בהצלחה</span>}
      </div>
    </div>
  )
}
