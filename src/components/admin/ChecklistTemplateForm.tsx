'use client'

import { useState } from 'react'
import { Plus, Trash2, X, RotateCcw } from 'lucide-react'
import { DEFAULT_CHECKLIST_TEMPLATE, type ChecklistSection } from '@/lib/checklist'

export default function ChecklistTemplateForm({ initial }: { initial: ChecklistSection[] }) {
  const [sections, setSections] = useState<ChecklistSection[]>(
    initial.length > 0 ? initial : DEFAULT_CHECKLIST_TEMPLATE,
  )
  const [saved, setSaved] = useState(false)

  function setTitle(si: number, title: string) {
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, title } : s)))
  }
  function setItem(si: number, ii: number, value: string) {
    setSections((prev) =>
      prev.map((s, i) => (i === si ? { ...s, items: s.items.map((it, j) => (j === ii ? value : it)) } : s)),
    )
  }
  function addItem(si: number) {
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, items: [...s.items, ''] } : s)))
  }
  function removeItem(si: number, ii: number) {
    setSections((prev) => prev.map((s, i) => (i === si ? { ...s, items: s.items.filter((_, j) => j !== ii) } : s)))
  }
  function removeSection(si: number) {
    setSections((prev) => prev.filter((_, i) => i !== si))
  }
  function addSection() {
    setSections((prev) => [...prev, { title: 'מדור חדש', items: [''] }])
  }
  function resetDefaults() {
    if (confirm('לשחזר את רשימת הציוד לברירת המחדל?')) setSections(DEFAULT_CHECKLIST_TEMPLATE)
  }

  async function save() {
    const clean = sections
      .map((s) => ({ title: s.title.trim(), items: s.items.map((i) => i.trim()).filter(Boolean) }))
      .filter((s) => s.title && s.items.length > 0)
    await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ checklist_template: JSON.stringify(clean) }),
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-6 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)] space-y-4">
      <div>
        <h2 className="font-semibold text-brand-ink">רשימת ציוד לאירוע (צ&apos;קליסט)</h2>
        <p className="text-xs text-brand-muted mt-1">
          זו רשימת ההכנה שהעובד רואה בכל אירוע ובלינק שנשלח אליו. מקובצת למדורים.
          כשמקבלים פריטים חדשים מהצוות — מוסיפים כאן, וזה מתעדכן בכל האירועים.
        </p>
      </div>

      <div className="space-y-4">
        {sections.map((section, si) => (
          <div key={si} className="rounded-xl border border-brand-line/70 bg-brand-cream/30 p-3">
            <div className="flex items-center gap-2 mb-2">
              <input
                value={section.title}
                onChange={(e) => setTitle(si, e.target.value)}
                placeholder="שם המדור"
                className="flex-1 border border-brand-line bg-white text-brand-ink rounded-lg px-3 py-2 text-sm font-semibold focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeSection(si)}
                className="shrink-0 p-2 text-brand-maroon/60 hover:text-brand-maroon hover:bg-brand-maroon/5 rounded-lg"
                aria-label="מחק מדור"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="space-y-1.5 pr-1">
              {section.items.map((item, ii) => (
                <div key={ii} className="flex items-center gap-1.5">
                  <span className="text-brand-muted/50 text-xs">•</span>
                  <input
                    value={item}
                    onChange={(e) => setItem(si, ii, e.target.value)}
                    placeholder="פריט"
                    className="flex-1 border border-brand-line bg-white text-brand-ink rounded-lg px-3 py-1.5 text-sm focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeItem(si, ii)}
                    className="shrink-0 p-1 text-brand-maroon/40 hover:text-brand-maroon"
                    aria-label="מחק פריט"
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={() => addItem(si)}
                className="inline-flex items-center gap-1 text-xs text-brand-maroon hover:text-brand-maroon-dark font-medium pr-4 pt-1"
              >
                <Plus size={13} />
                הוסף פריט
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <button onClick={addSection} className="inline-flex items-center gap-1.5 text-sm text-brand-maroon hover:text-brand-maroon-dark font-medium">
          <Plus size={15} />
          הוסף מדור
        </button>
        <button onClick={resetDefaults} className="inline-flex items-center gap-1.5 text-sm text-brand-muted hover:text-brand-ink">
          <RotateCcw size={14} />
          שחזר ברירת מחדל
        </button>
        <div className="flex-1" />
        <button onClick={save} className="bg-brand-maroon text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-maroon-dark">
          שמור רשימה
        </button>
        {saved && <span className="text-[#4A6B41] text-sm font-medium">✓ נשמר</span>}
      </div>
    </div>
  )
}
