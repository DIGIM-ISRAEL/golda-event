'use client'

import { useState } from 'react'
import { formatNIS } from '@/lib/pricing'
import type { Location } from '@/lib/types'

interface Props {
  locations: Location[]
  role: 'admin' | 'sales'
}

export default function LocationManager({ locations: initial, role }: Props) {
  const [locations, setLocations] = useState<Location[]>(initial)
  const [newCity, setNewCity] = useState('')
  const [newCost, setNewCost] = useState('')
  const [adding, setAdding] = useState(false)

  async function addLocation() {
    if (!newCity.trim() || !newCost) return
    setAdding(true)
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cityName: newCity.trim(), travelCostNis: Number(newCost) }),
    })
    if (res.ok) {
      const data = await res.json()
      setLocations([...locations, data].sort((a, b) => a.city_name.localeCompare(b.city_name, 'he')))
    }
    setNewCity('')
    setNewCost('')
    setAdding(false)
  }

  async function deleteLocation(id: string) {
    if (!confirm('למחוק מיקום זה?')) return
    await fetch(`/api/locations/${id}`, { method: 'DELETE' })
    setLocations(locations.filter((l) => l.id !== id))
  }

  async function updateCost(id: string, cost: number) {
    await fetch(`/api/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ travelCostNis: cost }),
    })
    setLocations(locations.map((l) => (l.id === id ? { ...l, travel_cost_nis: cost } : l)))
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-brand-line bg-white p-5 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)]">
        <h2 className="font-semibold text-brand-ink mb-3">הוספת מיקום חדש</h2>
        <div className="flex gap-3">
          <input
            value={newCity}
            onChange={(e) => setNewCity(e.target.value)}
            placeholder="שם עיר"
            className="flex-1 border border-brand-line bg-brand-cream/50 text-brand-ink rounded-xl px-3 py-2.5 text-sm focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
            onKeyDown={(e) => e.key === 'Enter' && addLocation()}
          />
          <input
            type="number"
            value={newCost}
            onChange={(e) => setNewCost(e.target.value)}
            placeholder="עלות ₪"
            className="w-28 border border-brand-line bg-brand-cream/50 text-brand-ink rounded-xl px-3 py-2.5 text-sm focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
          />
          <button
            onClick={addLocation}
            disabled={adding}
            className="bg-brand-maroon text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-maroon-dark disabled:opacity-60"
          >
            + הוסף
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-brand-line bg-white shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)]">
        <div className="px-5 py-4 border-b border-brand-line">
          <h2 className="font-semibold text-brand-ink">מיקומים קיימים ({locations.length})</h2>
        </div>
        <div className="divide-y divide-brand-line">
          {locations.map((loc) => (
            <div key={loc.id} className="flex items-center justify-between px-5 py-3">
              <span className="text-sm font-medium text-brand-ink">📍 {loc.city_name}</span>
              <div className="flex items-center gap-3">
                {role === 'admin' ? (
                  <input
                    type="number"
                    defaultValue={loc.travel_cost_nis}
                    onBlur={(e) => updateCost(loc.id, Number(e.target.value))}
                    className="w-24 border border-brand-line bg-brand-cream/50 text-brand-ink rounded-xl px-2 py-1.5 text-sm text-center focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
                  />
                ) : (
                  <span className="text-sm text-brand-muted">{formatNIS(loc.travel_cost_nis)}</span>
                )}
                <span className="text-xs text-brand-muted">נסיעה</span>
                {role === 'admin' && (
                  <button onClick={() => deleteLocation(loc.id)} className="text-brand-maroon/70 hover:text-brand-maroon text-xs px-1">✕</button>
                )}
              </div>
            </div>
          ))}
          {locations.length === 0 && (
            <div className="px-5 py-8 text-center text-sm text-brand-muted">אין מיקומים עדיין</div>
          )}
        </div>
      </div>
    </div>
  )
}
