'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Flavor } from '@/lib/types'

interface Props {
  flavors: Flavor[]
  role: 'admin' | 'sales'
}

export default function FlavorManager({ flavors: initial, role }: Props) {
  const supabase = createClient()
  const [flavors, setFlavors] = useState<Flavor[]>(initial)
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<'dairy' | 'parve'>('dairy')
  const [adding, setAdding] = useState(false)

  const dairy = flavors.filter((f) => f.category === 'dairy')
  const parve = flavors.filter((f) => f.category === 'parve')

  async function toggleStock(id: string, current: boolean) {
    await supabase.from('flavors').update({ is_in_stock: !current }).eq('id', id)
    setFlavors(flavors.map((f) => (f.id === id ? { ...f, is_in_stock: !current } : f)))
  }

  async function deleteFlavor(id: string) {
    if (!confirm('למחוק את הטעם הזה?')) return
    await supabase.from('flavors').delete().eq('id', id)
    setFlavors(flavors.filter((f) => f.id !== id))
  }

  async function addFlavor() {
    if (!newName.trim()) return
    setAdding(true)
    const { data } = await supabase
      .from('flavors')
      .insert({ name: newName.trim(), category: newCategory, is_in_stock: true })
      .select()
      .single()
    if (data) setFlavors([...flavors, data])
    setNewName('')
    setAdding(false)
  }

  function FlavorList({ list, title }: { list: Flavor[]; title: string }) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">{title}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            {list.filter((f) => f.is_in_stock).length} זמינים מתוך {list.length}
          </p>
        </div>
        <div className="divide-y divide-gray-50">
          {list.map((f) => (
            <div key={f.id} className="flex items-center justify-between px-5 py-3">
              <span className={`text-sm ${!f.is_in_stock ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                {f.name}
              </span>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleStock(f.id, f.is_in_stock)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${
                    f.is_in_stock ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 mt-0.5 rounded-full bg-white shadow transition-transform ${
                      f.is_in_stock ? 'translate-x-1' : 'translate-x-4'
                    }`}
                  />
                </button>
                <span className={`text-xs ${f.is_in_stock ? 'text-green-600' : 'text-gray-400'}`}>
                  {f.is_in_stock ? 'במלאי' : 'אזל'}
                </span>
                {role === 'admin' && (
                  <button
                    onClick={() => deleteFlavor(f.id)}
                    className="text-red-400 hover:text-red-600 text-xs px-1"
                  >
                    ✕
                  </button>
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
        <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-3">הוספת טעם חדש</h2>
          <div className="flex gap-3">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="שם הטעם"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && addFlavor()}
            />
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as 'dairy' | 'parve')}
              className="w-36 border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              <option value="dairy">חלבי</option>
              <option value="parve">פרווה</option>
            </select>
            <button
              onClick={addFlavor}
              disabled={adding}
              className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
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
