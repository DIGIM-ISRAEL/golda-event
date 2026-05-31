'use client'

import { useState } from 'react'
import type { Flavor } from '@/lib/types'

interface Props {
  flavors: Flavor[]
  role: 'admin' | 'sales'
}

export default function FlavorManager({ flavors: initial, role }: Props) {
  const [flavors, setFlavors] = useState<Flavor[]>(initial)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<'dairy' | 'parve'>('dairy')
  const [adding, setAdding] = useState(false)

  const dairy = flavors.filter((f) => f.category === 'dairy')
  const parve = flavors.filter((f) => f.category === 'parve')

  async function toggleStock(id: string, current: boolean) {
    await fetch(`/api/flavors/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isInStock: !current }),
    })
    setFlavors(flavors.map((f) => (f.id === id ? { ...f, is_in_stock: !current } : f)))
  }

  async function deleteFlavor(id: string) {
    if (!confirm('למחוק את הטעם הזה?')) return
    await fetch(`/api/flavors/${id}`, { method: 'DELETE' })
    setFlavors(flavors.filter((f) => f.id !== id))
  }

  async function addFlavor() {
    if (!newName.trim()) return
    setAdding(true)
    const res = await fetch('/api/flavors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), category: newCategory }),
    })
    if (res.ok) {
      const data = await res.json()
      setFlavors([...flavors, data])
    }
    setNewName('')
    setAdding(false)
  }

  function FlavorList({ list, title }: { list: Flavor[]; title: string }) {
    return (
      <div className="rounded-2xl border border-brand-line bg-white shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)]">
        <div className="px-5 py-4 border-b border-brand-line">
          <h2 className="font-semibold text-brand-ink">{title}</h2>
          <p className="text-xs text-brand-muted mt-0.5">
            {list.filter((f) => f.is_in_stock).length} זמינים מתוך {list.length}
          </p>
        </div>
        <div className="divide-y divide-brand-line">
          {list.map((f) => (
            <div key={f.id} className="flex items-center justify-between px-5 py-3">
              <span className={`text-sm ${!f.is_in_stock ? 'line-through text-brand-muted' : 'text-brand-ink'}`}>
                {f.name}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleStock(f.id, f.is_in_stock)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${f.is_in_stock ? 'bg-[#4F7A43]' : 'bg-brand-line'}`}
                >
                  <span className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${f.is_in_stock ? 'translate-x-1' : 'translate-x-4'}`} />
                </button>
                <span className={`text-xs ${f.is_in_stock ? 'text-[#4A6B41]' : 'text-brand-muted'}`}>
                  {f.is_in_stock ? 'במלאי' : 'אזל'}
                </span>
                {role === 'admin' && (
                  <button onClick={() => deleteFlavor(f.id)} className="text-brand-maroon/70 hover:text-brand-maroon text-xs px-1">✕</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {role === 'admin' && (
        <div className="rounded-2xl border border-brand-line bg-white p-5 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)]">
          <h2 className="font-semibold text-brand-ink mb-3">הוספת טעם חדש</h2>
          <div className="flex gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם הטעם"
              className="flex-1 border border-brand-line bg-brand-cream/50 text-brand-ink rounded-xl px-3 py-2.5 text-sm focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && addFlavor()}
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as 'dairy' | 'parve')}
              className="w-36 border border-brand-line bg-brand-cream/50 text-brand-ink rounded-xl px-3 py-2.5 text-sm focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
            >
              <option value="dairy">חלבי</option>
              <option value="parve">פרווה</option>
            </select>
            <button
              onClick={addFlavor}
              disabled={adding}
              className="bg-brand-maroon text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-maroon-dark disabled:opacity-60"
            >
              + הוסף
            </button>
          </div>
        </div>
      )}
      <FlavorList list={parve} title="🌿 פרווה / סורבה / טבעוני" />
      <FlavorList list={dairy} title="🥛 שמנת / חלבי" />
    </div>
  )
}
