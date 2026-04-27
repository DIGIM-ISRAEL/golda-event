'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { formatNIS } from '@/lib/pricing'
import type { Location } from '@/lib/types'

interface Props {
  locations: Location[]
  role: 'admin' | 'sales'
}

export default function LocationManager({ locations: initial, role }: Props) {
  const supabase = createClient()
  const [locations, setLocations] = useState<Location[]>(initial)
  const [newCity, setNewCity] = useState('')
  const [newCost, setNewCost] = useState('')
  const [adding, setAdding] = useState(false)

  async function addLocation() {
    if (!newCity.trim() || !newCost) return
    setAdding(true)
    const { data } = await supabase
      .from('locations')
      .insert({ city_name: newCity.trim(), travel_cost_nis: Number(newCost) })
      .select()
      .single()
    if (data) setLocations([...locations, data].sort((a, b) => a.city_name.localeCompare(b.city_name, 'he')))
    setNewCity('')
    setNewCost('')
    setAdding(false)
  }

  async function deleteLocation(id: string) {
    if (!confirm('למחוק מיקום זה?')) return
    await supabase.from('locations').delete().eq('id', id)
    setLocations(locations.filter((l) => l.id !== id))
  }

  async function updateCost(id: string, cost: number) {
    await supabase.from('locations').update({ travel_cost_nis: cost }).eq('id', id)
    setLocations(locations.map((l) => (l.id === id ? { ...l, travel_cost_nis: cost } : l)))
  }

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-3">הוספת מיקום חדש</h2>
        <div className="flex gap-3">
          <input
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="שם עיר"
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && addLocation()}
          />
          <input
            type="number"
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
            placeholder="עלות ₪"
            className="w-28 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
          <button
            onClick={addLocation}
            disabled={adding}
            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
          >
            + הוסף
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">מיקומים קיימים ({locations.length})</h2>
        </div>
        <div className="divide-y divide-gray-50">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-medium text-gray-800">📍 {loc.city_name}</span>
              <div className="flex items-center gap-3">
                {role === 'admin' ? (
                  <input
                    type="number"
                    defaultValue={loc.travel_cost_nis}
                    onBlur={(e) => updateCost(loc.id, Number(e.target.value))}
                    className="w-24 border border-gray-300 rounded-lg px-2 py-1.5 text-sm text-center focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                ) : (
                  <span className="text-sm text-gray-600">{formatNIS(loc.travel_cost_nis)}</span>
                )}
                <span className="text-xs text-gray-400">נסיעה</span>
                {role === 'admin' && (
                  <button
                    onClick={() => deleteLocation(loc.id)}
                    className="text-red-400 hover:text-red-600 text-xs px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>
          ))}
          {locations.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-gray-400">אין מיקומים עדיין</div>
          )}
        </div>
      </div>
    </div>
  )
}
