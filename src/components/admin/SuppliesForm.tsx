'use client'

import { useState } from 'react'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { DEFAULT_SUPPLIES, type SupplyItem } from '@/lib/constants'

export default function SuppliesForm({ initial }: { initial: SupplyItem[] }) {
  const [rows, setRows] = useState<SupplyItem[]>(initial.length > 0 ? initial : DEFAULT_SUPPLIES)
  const [saved, setSaved] = useState(false)

  function update(i: number, field: keyof SupplyItem, value: string) {
    setRows((prev) =>
      prev.map((r, idx) =>
        idx === i ? { ...r, [field]: field === 'label' ? value : Number(value) } : r,
      ),
    )
  }
  function remove(i: number) {
    setRows((prev) => prev.filter((_, idx) => idx !== i))
  }
  function add() {
    setRows((prev) => [...prev, { label: 'פריט חדש', unitCost: 0, qtyPerParticipant: 1 }])
  }
  function resetDefaults() {
    if (confirm('לשחזר את כלי ההגשה לברירת המחדל?')) setRows(DEFAULT_SUPPLIES)
  }

  async function save() {
    const clean = rows
      .map((r) => ({ label: r.label.trim(), unitCost: Number(r.unitCost) || 0, qtyPerParticipant: Number(r.qtyPerParticipant) || 0 }))
      .filter((r) => r.label)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ supply_costs: JSON.stringify(clean) }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const numCls =
    'w-full border border-brand-line bg-brand-cream/50 text-brand-ink rounded-lg px-2.5 py-2 text-sm text-center focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none'

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-6 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)] space-y-4">
      <div>
        <h2 className="font-semibold text-brand-ink">כלי הגשה ועלויות</h2>
        <p className="text-xs text-brand-muted mt-1">
          רשימת הכלים המתכלים שמחושבים ב&quot;כמה הכל עלה&quot; בצ&apos;קליסט המנהל. העלות לכל יחידה
          כפול הכמות למשתתף. (מאקסל: גביע ₪0.25, כפית ₪0.05, מפית ₪0.03, מגבון ₪0.11, שקית ₪0.25.)
        </p>
      </div>

      {/* כותרות */}
      <div className="flex items-center gap-2 px-1 text-[11px] font-semibold text-brand-muted">
        <span className="flex-1">פריט</span>
        <span className="w-24 text-center">₪ ליחידה</span>
        <span className="w-24 text-center">כמות/משתתף</span>
        <span className="w-8" />
      </div>

      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              value={r.label}
              onChange={(e) => update(i, 'label', e.target.value)}
              placeholder="שם הפריט"
              className="flex-1 border border-brand-line bg-brand-cream/50 text-brand-ink rounded-lg px-3 py-2 text-sm focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
            />
            <input
              type="number"
              step="0.001"
              min="0"
              value={r.unitCost}
              onChange={(e) => update(i, 'unitCost', e.target.value)}
              className={`${numCls} w-24`}
              dir="ltr"
            />
            <input
              type="number"
              step="0.1"
              min="0"
              value={r.qtyPerParticipant}
              onChange={(e) => update(i, 'qtyPerParticipant', e.target.value)}
              className={`${numCls} w-24`}
              dir="ltr"
            />
            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 p-2 text-brand-maroon/60 hover:text-brand-maroon hover:bg-brand-maroon/5 rounded-lg"
              aria-label="מחק"
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={add} className="inline-flex items-center gap-1.5 text-sm text-brand-maroon hover:text-brand-maroon-dark font-medium">
          <Plus size={15} />
          הוסף פריט
        </button>
        <button onClick={resetDefaults} className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
          <RotateCcw size={14} />
          שחזר ברירת מחדל
        </button>
        <div className="flex-1" />
        <button onClick={save} className="bg-brand-maroon text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-maroon-dark">
          שמור כלים
        </button>
        {saved && <span className="text-[#4A6B41] text-sm font-medium">✓ נשמר</span>}
      </div>
    </div>
  )
}
