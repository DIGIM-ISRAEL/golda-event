'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  profitWarningThreshold: number
  basketaCostNis: number
}

export default function SettingsForm({ profitWarningThreshold, basketaCostNis }: Props) {
  const supabase = createClient()
  const [threshold, setThreshold] = useState(profitWarningThreshold)
  const [basketaCost, setBasketaCost] = useState(basketaCostNis)
  const [saved, setSaved] = useState(false)

  async function save() {
    await Promise.all([
      supabase.from('settings').upsert({ key: 'profit_warning_threshold', value: String(threshold) }),
      supabase.from('settings').upsert({ key: 'basketa_cost_nis', value: String(basketaCost) }),
    ])
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 space-y-5">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          סף אזהרת רווח (₪)
        </label>
        <p className="text-xs text-gray-500 mb-2">
          אם הרווח הנקי נמוך מסכום זה, תוצג אזהרה אדומה
        </p>
        <input
          type="number"
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          עלות בסקטה (₪)
        </label>
        <p className="text-xs text-gray-500 mb-2">
          עלות בסקטת גלידה אחת (4.5 ק"ג) לחישוב עלות המלאי
        </p>
        <input
          type="number"
          value={basketaCost}
          onChange={(e) => setBasketaCost(Number(e.target.value))}
          className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={save}
          className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          שמור הגדרות
        </button>
        {saved && (
          <span className="text-green-600 text-sm font-medium">✓ נשמר בהצלחה</span>
        )}
      </div>
    </div>
  )
}
