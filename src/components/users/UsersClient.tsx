'use client'

import { useState } from 'react'

interface User {
  id: string
  email: string
  fullName: string
  role: 'admin' | 'sales'
  phoneNumber: string | null
  createdAt: string
}

interface Props {
  initialUsers: User[]
  currentUserId: string
}

const ROLE_LABELS = { admin: 'מנהל', sales: 'איש מכירות' }

export default function UsersClient({ initialUsers, currentUserId }: Props) {
  const [users, setUsers] = useState<User[]>(initialUsers)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    password: '',
    role: 'sales' as 'admin' | 'sales',
    phoneNumber: '',
  })

  function openNew() {
    setEditing(null)
    setForm({ fullName: '', email: '', password: '', role: 'sales', phoneNumber: '' })
    setError('')
    setShowForm(true)
  }

  function openEdit(user: User) {
    setEditing(user)
    setForm({ fullName: user.fullName, email: user.email, password: '', role: user.role, phoneNumber: user.phoneNumber ?? '' })
    setError('')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (editing) {
        const body: Record<string, string> = {
          fullName: form.fullName,
          email: form.email,
          role: form.role,
          phoneNumber: form.phoneNumber,
        }
        if (form.password) body.password = form.password

        const res = await fetch(`/api/users/${editing.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error || 'שגיאה')
          return
        }
        const updated: User = await res.json()
        setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)))
      } else {
        const res = await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
        if (!res.ok) {
          const d = await res.json()
          setError(d.error || 'שגיאה')
          return
        }
        const created: User = await res.json()
        setUsers((prev) => [...prev, created])
      }
      setShowForm(false)
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(user: User) {
    if (!confirm(`למחוק את ${user.fullName}?`)) return
    const res = await fetch(`/api/users/${user.id}`, { method: 'DELETE' })
    if (!res.ok) {
      const d = await res.json()
      alert(d.error || 'שגיאה במחיקה')
      return
    }
    setUsers((prev) => prev.filter((u) => u.id !== user.id))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">ניהול משתמשים</h1>
        <button
          onClick={openNew}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + משתמש חדש
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">שם</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">מייל</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">טלפון</th>
              <th className="text-right px-4 py-3 font-semibold text-gray-700">תפקיד</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">
                  {user.fullName}
                  {user.id === currentUserId && (
                    <span className="mr-2 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">אתה</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-600">{user.email}</td>
                <td className="px-4 py-3 text-gray-600 dir-ltr text-left">{user.phoneNumber || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`text-xs px-2 py-1 rounded-full font-medium ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {ROLE_LABELS[user.role]}
                  </span>
                </td>
                <td className="px-4 py-3 text-left">
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => openEdit(user)}
                      className="text-xs text-blue-600 hover:underline"
                    >
                      עריכה
                    </button>
                    {user.id !== currentUserId && (
                      <button
                        onClick={() => handleDelete(user)}
                        className="text-xs text-red-500 hover:underline"
                      >
                        מחיקה
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl" dir="rtl">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              {editing ? 'עריכת משתמש' : 'משתמש חדש'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">שם מלא *</label>
                <input
                  type="text"
                  required
                  value={form.fullName}
                  onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">מייל *</label>
                <input
                  type="email"
                  required
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  סיסמה {editing ? '(השאר ריק לאי-שינוי)' : '*'}
                </label>
                <input
                  type="password"
                  required={!editing}
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  מספר טלפון (לחיוג לידים)
                </label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value }))}
                  placeholder="972501234567"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1">פורמט בינלאומי ללא + (לדוגמה: 972501234567)</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">תפקיד</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'sales' }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="sales">איש מכירות</option>
                  <option value="admin">מנהל</option>
                </select>
              </div>

              {error && <p className="text-sm text-red-600">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {loading ? 'שומר...' : editing ? 'שמור שינויים' : 'צור משתמש'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  ביטול
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
