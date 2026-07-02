'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronRight, ListChecks, Plus, X } from 'lucide-react'
import { DEFAULT_CHECKLIST_TEMPLATE, allTemplateItems, type ChecklistSection } from '@/lib/checklist'
import { cn } from '@/lib/utils'

interface Props {
  leadId: string
  initialCheckedItems: string[]
  initialCustomItems?: string[]
  basketasRequired: number
  flavors: { name: string; category: string }[]
  template?: ChecklistSection[]
  embedded?: boolean // כשמוטמע בתוך סקשן — בלי מסגרת/צל חיצוניים
  saveUrl?: string // ברירת מחדל: /api/leads/[id]/checklist; לטוקן ציבורי — /api/checklist/[token]
}

// פריט אד-הוק מקבל מזהה ייציב לפי הטקסט, כדי לעקוב אחרי הסימון שלו
const customKey = (label: string) => `custom:${label}`

export default function EventChecklist({
  leadId,
  initialCheckedItems,
  initialCustomItems = [],
  basketasRequired,
  flavors,
  template,
  embedded = false,
  saveUrl,
}: Props) {
  const url = saveUrl ?? `/api/leads/${leadId}/checklist`
  const sections = template ?? DEFAULT_CHECKLIST_TEMPLATE
  const [checked, setChecked] = useState<Set<string>>(new Set(initialCheckedItems))
  const [customItems, setCustomItems] = useState<string[]>(initialCustomItems)
  const [newItem, setNewItem] = useState('')
  const [pending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(true)

  // Special "basketas" item is also tracked
  const basketasChecked = checked.has('__basketas__')
  const flavorsChecked = checked.has('__flavors__')

  // Total includes the 2 computed items + template items + custom items
  const computedItemsTotal = 2
  const totalWithComputed = allTemplateItems(sections).length + computedItemsTotal + customItems.length
  const allCheckedCount = checked.size

  function saveChecked(newChecked: Set<string>) {
    startTransition(async () => {
      try {
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkedItems: Array.from(newChecked) }),
        })
      } catch (err) {
        console.error('Failed to update checklist:', err)
        setChecked(checked)
      }
    })
  }

  function toggle(itemId: string) {
    const newChecked = new Set(checked)
    if (newChecked.has(itemId)) newChecked.delete(itemId)
    else newChecked.add(itemId)
    setChecked(newChecked)
    saveChecked(newChecked)
  }

  function addCustom() {
    const label = newItem.trim()
    if (!label || customItems.includes(label)) return
    const updated = [...customItems, label]
    setCustomItems(updated)
    setNewItem('')
    startTransition(async () => {
      try {
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customChecklistItems: updated }),
        })
      } catch {
        /* רך */
      }
    })
  }

  function removeCustom(label: string) {
    const updated = customItems.filter((c) => c !== label)
    setCustomItems(updated)
    const newChecked = new Set(checked)
    newChecked.delete(customKey(label))
    setChecked(newChecked)
    startTransition(async () => {
      try {
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customChecklistItems: updated, checkedItems: Array.from(newChecked) }),
        })
      } catch {
        /* רך */
      }
    })
  }

  const progress = Math.round((allCheckedCount / totalWithComputed) * 100)

  return (
    <div
      className={cn(
        'overflow-hidden',
        embedded
          ? 'rounded-xl border border-brand-line/60'
          : 'bg-white rounded-2xl border border-brand-line shadow-[0_1px_2px_rgba(93,42,49,0.04),0_12px_32px_-22px_rgba(93,42,49,0.22)]',
      )}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-brand-cream/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="flex items-center gap-2 font-serif text-[15px] font-semibold text-brand-ink">
            <ListChecks size={16} className="text-brand-gold" />
            רשימת הכנה לאירוע
          </h2>
          <span className="text-sm text-brand-muted">
            {allCheckedCount}/{totalWithComputed}
          </span>
          {pending && <span className="text-xs text-brand-gold">שומר…</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-brand-line/60 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#86A86F] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ChevronRight
            size={20}
            className={cn('text-brand-muted/60 transition-transform', expanded && 'rotate-90')}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-brand-line/70 pt-4">
          {/* פריטים מחושבים — בסקטות וטעמים */}
          <div>
            <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wide mb-2">
              מלאי לפי האירוע
            </h3>
            <div className="space-y-1.5">
              <ChecklistRow
                checked={basketasChecked}
                onToggle={() => toggle('__basketas__')}
                label={
                  <span>
                    <span className="font-bold text-brand-maroon">{basketasRequired} בסקטות</span>
                    <span className="text-brand-muted text-xs mr-2">
                      ({basketasRequired * 4.5} ק&quot;ג גלידה)
                    </span>
                  </span>
                }
              />
              <ChecklistRow
                checked={flavorsChecked}
                onToggle={() => toggle('__flavors__')}
                label={
                  <span>
                    <span className="font-medium">{flavors.length} טעמים נבחרים</span>
                    {flavors.length > 0 && (
                      <span className="text-brand-muted text-xs mr-2 block">
                        {flavors.map((f) => f.name).join(' · ')}
                      </span>
                    )}
                  </span>
                }
              />
            </div>
          </div>

          {/* פריטים לפי מדור (מהתבנית הניתנת לעריכה בהגדרות) */}
          {sections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wide mb-2">
                {section.title}
              </h3>
              <div className="space-y-1.5">
                {section.items.map((label) => (
                  <ChecklistRow
                    key={label}
                    checked={checked.has(label)}
                    onToggle={() => toggle(label)}
                    label={<span className="font-medium">{label}</span>}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* פריטים אד-הוק לאירוע הזה */}
          <div>
            <h3 className="text-xs font-bold text-brand-muted uppercase tracking-wide mb-2">
              מיוחד לאירוע
            </h3>
            <div className="space-y-1.5">
              {customItems.map((label) => (
                <div key={label} className="flex items-center gap-1">
                  <div className="flex-1">
                    <ChecklistRow
                      checked={checked.has(customKey(label))}
                      onToggle={() => toggle(customKey(label))}
                      label={<span className="font-medium">{label}</span>}
                    />
                  </div>
                  <button
                    onClick={() => removeCustom(label)}
                    className="shrink-0 p-1.5 text-brand-maroon/50 hover:text-brand-maroon"
                    aria-label="מחק פריט"
                  >
                    <X size={15} />
                  </button>
                </div>
              ))}
              <div className="flex gap-2 pt-1">
                <input
                  value={newItem}
                  onChange={(e) => setNewItem(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addCustom()}
                  placeholder="הוסף פריט לאירוע (שלט יום הולדת, עגלה שנייה…)"
                  className="flex-1 border border-brand-line bg-brand-cream/50 text-brand-ink rounded-lg px-3 py-2 text-sm placeholder:text-brand-muted/50 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
                />
                <button
                  onClick={addCustom}
                  className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-white border border-brand-gold/40 text-brand-gold-deep px-3 text-sm font-semibold hover:bg-brand-cream/60"
                >
                  <Plus size={15} />
                  הוסף
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function ChecklistRow({
  checked,
  onToggle,
  label,
}: {
  checked: boolean
  onToggle: () => void
  label: React.ReactNode
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        'w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-right transition-colors',
        checked ? 'bg-[#EAF1E3] hover:bg-[#E1EBD8]' : 'hover:bg-brand-cream/60',
      )}
    >
      <div
        className={cn(
          'w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition-colors',
          checked ? 'bg-[#6E9A5B] border-[#6E9A5B]' : 'border-brand-line bg-white',
        )}
      >
        {checked && <Check size={14} className="text-white" strokeWidth={3} />}
      </div>
      <div
        className={cn('text-sm flex-1', checked ? 'text-brand-muted line-through' : 'text-brand-ink')}
      >
        {label}
      </div>
    </button>
  )
}
