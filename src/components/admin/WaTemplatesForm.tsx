'use client'

import { useState } from 'react'
import { Plus, Trash2, RotateCcw } from 'lucide-react'
import { DEFAULT_WA_TEMPLATES, WA_PLACEHOLDERS, type WaTemplate } from '@/lib/wa-templates'

export default function WaTemplatesForm({ initial }: { initial: WaTemplate[] }) {
  const [templates, setTemplates] = useState<WaTemplate[]>(
    initial.length > 0 ? initial : DEFAULT_WA_TEMPLATES,
  )
  const [saved, setSaved] = useState(false)

  function update(i: number, field: keyof WaTemplate, value: string) {
    setTemplates((prev) => prev.map((t, idx) => (idx === i ? { ...t, [field]: value } : t)))
  }
  function remove(i: number) {
    setTemplates((prev) => prev.filter((_, idx) => idx !== i))
  }
  function add() {
    setTemplates((prev) => [...prev, { title: 'תבנית חדשה', body: 'שלום {שם}!' }])
  }
  function resetDefaults() {
    if (confirm('לשחזר את תבניות ברירת המחדל? כל השינויים שלך יימחקו.')) {
      setTemplates(DEFAULT_WA_TEMPLATES)
    }
  }

  async function save() {
    const clean = templates
      .map((t) => ({ title: t.title.trim(), body: t.body.trim() }))
      .filter((t) => t.title && t.body)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ wa_templates: JSON.stringify(clean) }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const inputCls =
    'w-full border border-brand-line bg-brand-cream/50 text-brand-ink rounded-xl px-3 py-2.5 text-sm focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none'

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-6 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)] space-y-4">
      <div>
        <h2 className="font-semibold text-brand-ink">תבניות הודעה לוואטסאפ</h2>
        <p className="text-xs text-brand-muted mt-1">
          ההודעות האלו מופיעות ככפתורים בעמוד הליד. אפשר להשתמש במשתנים שמתמלאים אוטומטית:{' '}
          <span dir="ltr" className="font-mono text-brand-gold-deep">
            {WA_PLACEHOLDERS.join('  ')}
          </span>
        </p>
      </div>

      <div className="space-y-3">
        {templates.map((t, i) => (
          <div key={i} className="rounded-xl border border-brand-line/70 bg-brand-cream/30 p-3 space-y-2">
            <div className="flex items-center gap-2">
              <input
                value={t.title}
                onChange={(e) => update(i, 'title', e.target.value)}
                placeholder="שם הכפתור"
                className={`${inputCls} font-medium`}
              />
              <button
                type="button"
                onClick={() => remove(i)}
                className="shrink-0 p-2 text-brand-maroon/60 hover:text-brand-maroon hover:bg-brand-maroon/5 rounded-lg"
                aria-label="מחק תבנית"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <textarea
              value={t.body}
              onChange={(e) => update(i, 'body', e.target.value)}
              rows={3}
              placeholder="גוף ההודעה..."
              className={`${inputCls} resize-none leading-relaxed`}
            />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={add}
          className="inline-flex items-center gap-1.5 text-sm text-brand-maroon hover:text-brand-maroon-dark font-medium"
        >
          <Plus size={15} />
          הוסף תבנית
        </button>
        <button
          onClick={resetDefaults}
          className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink"
        >
          <RotateCcw size={14} />
          שחזר ברירת מחדל
        </button>
        <div className="flex-1" />
        <button
          onClick={save}
          className="bg-brand-maroon text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-maroon-dark"
        >
          שמור תבניות
        </button>
        {saved && <span className="text-[#4A6B41] text-sm font-medium">✓ נשמר</span>}
      </div>
    </div>
  )
}
