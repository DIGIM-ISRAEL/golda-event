'use client'

import { useState, useTransition } from 'react'
import { Check, ChevronRight } from 'lucide-react'
import { CHECKLIST_ITEMS, CATEGORY_LABELS, groupedItems } from '@/lib/checklist'

interface Props {
  leadId: string
  initialCheckedItems: string[]
  basketasRequired: number
  flavors: { name: string; category: string }[]
}

export default function EventChecklist({
  leadId,
  initialCheckedItems,
  basketasRequired,
  flavors,
}: Props) {
  const [checked, setChecked] = useState<Set<string>>(new Set(initialCheckedItems))
  const [pending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(true)

  const groups = groupedItems()
  const totalItems = CHECKLIST_ITEMS.length + 1 // +1 for basketas (computed)
  const checkedCount =
    checked.size + (checked.has('__basketas__') ? 0 : 0)

  // Special "basketas" item is also tracked
  const basketasChecked = checked.has('__basketas__')
  const flavorsChecked = checked.has('__flavors__')

  // Total includes the 2 computed items
  const computedItemsTotal = 2
  const totalWithComputed = CHECKLIST_ITEMS.length + computedItemsTotal
  const allCheckedCount = checked.size

  function toggle(itemId: string) {
    const newChecked = new Set(checked)
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId)
    } else {
      newChecked.add(itemId)
    }
    setChecked(newChecked)

    startTransition(async () => {
      try {
        await fetch(`/api/leads/${leadId}/checklist`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checkedItems: Array.from(newChecked) }),
        })
      } catch (err) {
        // החזר את המצב במקרה של שגיאה
        console.error('Failed to update checklist:', err)
        setChecked(checked)
      }
    })
  }

  const progress = Math.round((allCheckedCount / totalWithComputed) * 100)

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-5 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <h2 className="font-semibold text-gray-900">📋 רשימת הכנה לאירוע</h2>
          <span className="text-sm text-gray-500">
            {allCheckedCount}/{totalWithComputed}
          </span>
          {pending && <span className="text-xs text-brand-gold">שומר...</span>}
        </div>
        <div className="flex items-center gap-3">
          <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <ChevronRight
            size={20}
            className={`text-gray-400 transition-transform ${
              expanded ? 'rotate-90' : ''
            }`}
          />
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-gray-100 pt-4">
          {/* פריטים מחושבים — בסקטות וטעמים */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">
              מלאי לפי האירוע
            </h3>
            <div className="space-y-1.5">
              <ChecklistRow
                checked={basketasChecked}
                onToggle={() => toggle('__basketas__')}
                label={
                  <span>
                    <span className="font-bold text-brand-maroon-dark">
                      {basketasRequired} בסקטות
                    </span>
                    <span className="text-gray-500 text-xs mr-2">
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
                    <span className="font-medium">
                      {flavors.length} טעמים נבחרים
                    </span>
                    {flavors.length > 0 && (
                      <span className="text-gray-500 text-xs mr-2 block">
                        {flavors.map((f) => f.name).join(' · ')}
                      </span>
                    )}
                  </span>
                }
              />
            </div>
          </div>

          {/* פריטים לפי קטגוריה */}
          {Object.entries(groups).map(([category, items]) => (
            <div key={category}>
              <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">
                {CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}
              </h3>
              <div className="space-y-1.5">
                {items.map((item) => (
                  <ChecklistRow
                    key={item.id}
                    checked={checked.has(item.id)}
                    onToggle={() => toggle(item.id)}
                    label={<span className="font-medium">{item.label}</span>}
                  />
                ))}
              </div>
            </div>
          ))}
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
      className={`w-full flex items-center gap-3 px-2 py-1.5 rounded-lg text-right transition-colors ${
        checked ? 'bg-green-50 hover:bg-green-100' : 'hover:bg-gray-50'
      }`}
    >
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          checked
            ? 'bg-green-500 border-green-500'
            : 'border-gray-300 bg-white'
        }`}
      >
        {checked && <Check size={14} className="text-white" strokeWidth={3} />}
      </div>
      <div
        className={`text-sm flex-1 ${
          checked ? 'text-gray-500 line-through' : 'text-gray-900'
        }`}
      >
        {label}
      </div>
    </button>
  )
}
