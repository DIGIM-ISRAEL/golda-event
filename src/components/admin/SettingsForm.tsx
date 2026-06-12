'use client'

import { useState } from 'react'

interface Props {
  profitWarningThreshold: number
  basketaCostNis: number
  depositPercent: number
  depositInstructions: string
  depositLink: string
}

export default function SettingsForm({
  profitWarningThreshold,
  basketaCostNis,
  depositPercent: initialDepositPercent,
  depositInstructions: initialDepositInstructions,
  depositLink: initialDepositLink,
}: Props) {
  const [threshold, setThreshold] = useState(profitWarningThreshold)
  const [basketaCost, setBasketaCost] = useState(basketaCostNis)
  const [depositPercent, setDepositPercent] = useState(initialDepositPercent)
  const [depositInstructions, setDepositInstructions] = useState(initialDepositInstructions)
  const [depositLink, setDepositLink] = useState(initialDepositLink)
  const [saved, setSaved] = useState(false)

  async function save() {
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        profit_warning_threshold: String(threshold),
        basketa_cost_nis: String(basketaCost),
        deposit_percent: String(depositPercent),
        deposit_instructions: depositInstructions,
        deposit_link: depositLink.trim(),
      }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputCls =
    'w-full border border-brand-line bg-brand-cream/50 text-brand-ink rounded-xl px-3 py-2.5 text-sm focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none'

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-brand-line bg-white p-6 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)] space-y-5">
        <h2 className="font-semibold text-brand-ink">רווחיות ומלאי</h2>
        <div>
          <label className="block text-sm font-medium text-brand-ink mb-1">סף אזהרת רווח (₪)</label>
          <p className="text-xs text-brand-muted mb-2">אם הרווח הנקי נמוך מסכום זה, תוצג אזהרה אדומה</p>
          <input type="number" value={threshold} onChange={(e) => setThreshold(Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-ink mb-1">עלות בסקטה (₪)</label>
          <p className="text-xs text-brand-muted mb-2">עלות בסקטת גלידה אחת (4.5 ק&quot;ג) לחישוב עלות המלאי</p>
          <input type="number" value={basketaCost} onChange={(e) => setBasketaCost(Number(e.target.value))} className={inputCls} />
        </div>
      </div>

      <div className="rounded-2xl border border-brand-line bg-white p-6 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)] space-y-5">
        <div>
          <h2 className="font-semibold text-brand-ink">מקדמה אחרי חתימה</h2>
          <p className="text-xs text-brand-muted mt-1">
            אחרי שהלקוח חותם על ההצעה, יוצג לו מסך &quot;שריון התאריך&quot; עם סכום המקדמה והוראות התשלום.
            השאר אחוז 0 או הוראות ריקות כדי לכבות.
          </p>
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-ink mb-1">אחוז מקדמה (%)</label>
          <p className="text-xs text-brand-muted mb-2">הנורמה בענף האירועים: 25–50%. הסכום מחושב אוטומטית מסך ההצעה</p>
          <input type="number" min={0} max={100} value={depositPercent} onChange={(e) => setDepositPercent(Number(e.target.value))} className={inputCls} />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-ink mb-1">הוראות תשלום</label>
          <p className="text-xs text-brand-muted mb-2">
            לדוגמה: &quot;ביט/פייבוקס למספר 050-0000000 (על שם גולדה אירועים)&quot; או פרטי העברה בנקאית
          </p>
          <textarea rows={3} value={depositInstructions} onChange={(e) => setDepositInstructions(e.target.value)} className={`${inputCls} resize-none`} placeholder="איך משלמים את המקדמה..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-brand-ink mb-1">קישור לתשלום (לא חובה)</label>
          <p className="text-xs text-brand-muted mb-2">קישור תשלום של Grow / PayBox / ביט לעסקים — יוצג ככפתור &quot;לתשלום המקדמה&quot;</p>
          <input type="url" dir="ltr" value={depositLink} onChange={(e) => setDepositLink(e.target.value)} className={inputCls} placeholder="https://..." />
        </div>
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
