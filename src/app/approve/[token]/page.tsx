'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useParams } from 'next/navigation'

export default function ApprovePage() {
  const params = useParams()
  const token = params.token as string
  const supabase = createClient()

  const [name, setName] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function approve() {
    if (!name.trim()) { setError('נא להזין שם מלא'); return }
    setLoading(true)
    setError('')

    const { error: e } = await supabase
      .from('leads')
      .update({
        client_approved_at: new Date().toISOString(),
        client_approved_name: name.trim(),
      })
      .eq('signature_token', token)

    if (e) {
      setError('שגיאה. ייתכן שהקישור אינו תקף.')
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-10 text-center max-w-md">
          <div className="text-5xl mb-4">✅</div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">אושר בהצלחה!</h1>
          <p className="text-gray-600">ההצעה אושרה על ידי {name}.</p>
          <p className="text-gray-500 text-sm mt-2">נציג שלנו יצור קשר לאישור פרטים נוספים.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md text-center">
        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
          <span className="text-white text-2xl">G</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">אישור הצעת מחיר</h1>
        <p className="text-gray-600 text-sm mb-6">
          גולדה אירועים — שירותי גלידה
        </p>

        <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-800 mb-6">
          לחיצה על "אני מאשר/ת" מהווה הסכמה לתנאי ההצעה שנשלחה אליך.
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">שם מלא *</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="הזן את שמך המלא"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>
        )}

        <button
          onClick={approve}
          disabled={loading}
          className="w-full bg-green-600 text-white rounded-lg py-3 font-semibold hover:bg-green-700 disabled:opacity-60"
        >
          {loading ? 'שולח...' : '✅ אני מאשר/ת את ההצעה'}
        </button>
      </div>
    </div>
  )
}
