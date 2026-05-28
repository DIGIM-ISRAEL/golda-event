'use client'

import { useState, useEffect } from 'react'

interface AirtableFields {
  phone_number?: string
  phone_my_user?: string
  'Lead Quality Score'?: number
  'Call Summary'?: string
  phone_fundraiser?: string
  [key: string]: unknown
}

interface AirtableLead {
  id: string
  fields: AirtableFields
}

export default function IncomingLeadsSection({ isAdmin }: { isAdmin: boolean }) {
  const [leads, setLeads] = useState<AirtableLead[]>([])
  const [loading, setLoading] = useState(true)
  const [callingId, setCallingId] = useState<string | null>(null)
  const [callResults, setCallResults] = useState<Record<string, { success: boolean; error?: string }>>({})
  const [open, setOpen] = useState(true)

  useEffect(() => {
    fetch('/api/airtable/leads')
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLeads(data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  async function handleCall(lead: AirtableLead) {
    const phone = lead.fields.phone_number
    if (!phone) return
    setCallingId(lead.id)
    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordId: lead.id, phoneNumber: phone, phoneFundraiser: lead.fields.phone_fundraiser ?? '' }),
      })
      const data = await res.json()
      setCallResults((prev) => ({ ...prev, [lead.id]: data }))
      if (data.success) {
        setTimeout(async () => {
          try {
            const r = await fetch(`/api/airtable/leads/${lead.id}`)
            if (r.ok) {
              const updated: AirtableLead = await r.json()
              setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
            }
          } catch { /* silent */ }
        }, 5000)
      }
    } catch {
      setCallResults((prev) => ({ ...prev, [lead.id]: { success: false, error: 'שגיאת רשת' } }))
    } finally {
      setCallingId(null)
    }
  }

  if (loading || leads.length === 0) return null

  return (
    <div className="mb-6">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 mb-3 text-sm font-semibold text-gray-700 hover:text-gray-900"
      >
        <span className="text-green-500">●</span>
        לידים נכנסים ({leads.length})
        {isAdmin && <span className="text-xs font-normal text-gray-400">כל הנציגים</span>}
        <span className="text-gray-400 text-xs">{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {leads.map((lead) => {
            const f = lead.fields
            const callResult = callResults[lead.id]
            const isCalling = callingId === lead.id
            const score = f['Lead Quality Score']

            return (
              <div
                key={lead.id}
                className="shrink-0 w-52 bg-white rounded-xl border border-gray-200 p-3 shadow-sm flex flex-col gap-2"
              >
                <div className="text-sm font-semibold text-gray-800" dir="ltr">{f.phone_number ?? '—'}</div>
                {isAdmin && f.phone_my_user && (
                  <div className="text-xs text-gray-400" dir="ltr">{f.phone_my_user}</div>
                )}
                {score !== undefined && (
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((i) => (
                      <span key={i} className={i <= Math.round((score/10)*5) ? 'text-yellow-400 text-sm' : 'text-gray-200 text-sm'}>★</span>
                    ))}
                    <span className="text-xs text-gray-500 mr-1">{score}/10</span>
                  </div>
                )}
                {f['Call Summary'] && (
                  <div className="text-xs text-gray-500 line-clamp-2">{f['Call Summary']}</div>
                )}
                {callResult && (
                  <div className={`text-xs rounded px-2 py-1 ${callResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                    {callResult.success ? '✓ חוייג' : `✗ ${callResult.error}`}
                  </div>
                )}
                <button
                  onClick={() => handleCall(lead)}
                  disabled={isCalling || !f.phone_number}
                  className="mt-auto w-full bg-brand-maroon text-white text-xs font-medium py-1.5 rounded-lg hover:bg-brand-maroon-dark disabled:opacity-50 transition-colors"
                >
                  {isCalling ? '📞 מחייג...' : '📞 חייג'}
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
