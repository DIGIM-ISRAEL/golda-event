'use client'

import { useState } from 'react'
import { Minus, Plus, Undo2 } from 'lucide-react'
import { formatNIS } from '@/lib/pricing'
import type { EventFlavorLine } from '@/lib/event-cost'

/* ── סטפר +/− (בסקטות) ─────────────────────────────── */
export function Stepper({
  value,
  onChange,
  max,
}: {
  value: number
  onChange: (v: number) => void
  max: number
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        className="grid place-items-center w-8 h-8 rounded-lg border border-brand-line bg-white text-brand-ink disabled:opacity-30 hover:bg-brand-cream/60"
        aria-label="הפחת"
      >
        <Minus size={15} />
      </button>
      <span className="w-7 text-center font-serif text-lg font-bold text-brand-ink tabular-nums">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="grid place-items-center w-8 h-8 rounded-lg border border-brand-line bg-white text-brand-ink disabled:opacity-30 hover:bg-brand-cream/60"
        aria-label="הוסף"
      >
        <Plus size={15} />
      </button>
    </div>
  )
}

/* ── שדה משקל (ק"ג) ─────────────────────────────── */
export function KgInput({
  value,
  max,
  onChange,
}: {
  value: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min={0}
        max={max}
        value={value || ''}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 text-center font-serif text-base font-bold text-brand-ink tabular-nums border border-brand-line bg-white rounded-lg px-2 py-1.5 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
        dir="ltr"
      />
      <span className="text-xs text-brand-muted">ק&quot;ג</span>
    </div>
  )
}

/* ── בלוק החזרות (משותף, עם/בלי מחירים) — לפי משקל ─────────────────────────────── */
export function ReturnsBlock({
  lines,
  status,
  showCosts,
  onReturnKg,
}: {
  lines: EventFlavorLine[]
  status: string
  showCosts: boolean
  onReturnKg: (flavorId: string, value: number) => void
}) {
  const isDone = status === 'closed' || status === 'done'
  const [open, setOpen] = useState(isDone)
  const totalReturnedKg = lines.reduce((s, l) => s + l.returnedKg, 0)

  if (lines.length === 0) return null

  return (
    <div className="m-2 rounded-xl border border-brand-gold/30 bg-[#FCF7EE] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-right"
      >
        <span className="flex items-center gap-2 font-semibold text-brand-ink text-sm">
          <Undo2 size={15} className="text-brand-gold-deep" />
          חזרה מאירוע — משקל שחזר לכל טעם
        </span>
        <span className="text-xs text-brand-muted">
          {totalReturnedKg > 0 ? `${totalReturnedKg.toFixed(1)} ק"ג חזרו` : open ? 'סגור' : 'פתח'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1">
          <p className="text-xs text-brand-muted mb-3 leading-relaxed">
            שִקלו את מה שחזר והזינו <b>ק&quot;ג לכל טעם</b>. בסקטה מלאה = 4.5 ק&quot;ג. הזיכוי מחושב יחסית למשקל.
          </p>
          <div className="space-y-1.5">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 py-1">
                <div className="min-w-0">
                  <div className="text-sm text-brand-ink truncate">{l.name}</div>
                  <div className="text-[11px] text-brand-muted">
                    יצא {l.outKg.toFixed(1)} ק&quot;ג
                    {showCosts && l.returnedKg > 0 && (
                      <span className="text-[#3D5A30] font-medium"> · זיכוי {formatNIS(l.returnCredit)}</span>
                    )}
                  </div>
                </div>
                <KgInput value={l.returnedKg} max={l.outKg} onChange={(v) => onReturnKg(l.id, v)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
