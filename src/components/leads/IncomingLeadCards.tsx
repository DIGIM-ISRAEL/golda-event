'use client'

import { useState, useEffect } from 'react'

interface AirtableFields {
  phone_number?: string
  phone_my_user?: string
  phone_fundraiser?: string
  'Lead Quality Score'?: number
  'Call Summary'?: string
  [key: string]: unknown
}

interface AirtableLead {
  id: string
  fields: AirtableFields
}

export default function IncomingLeadCards({ isAdmin }: { isAdmin: boolean }) {
  const [leads, setLeads] = useState<AirtableLead[]>([])
  const [callingId, setCallingId] = useState<string | null>(null)
  const [callResults, setCallResults] = useState<Record<string, { success: boolean; error?: string }>>({})

  useEffect(() => {
    fetch('/api/airtable/leads')
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setLeads(data) })
      .catch(() => {})
  }, [])

  async function handleCall(lead: AirtableLead) {
    const phone = lead.fields.phone_number
    if (!phone) return
    setCallingId(lead.id)
    try {
      const res = await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recordId: lead.id,
          phoneNumber: phone,
          phoneFundraiser: lead.fields.phone_fundraiser ?? '',
        }),
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

  if (leads.length === 0) return null

  return (
    <>
      {leads.map((lead) => {
        const f = lead.fields
        const callResult = callResults[lead.id]
        const isCalling = callingId === lead.id
        const score = f['Lead Quality Score']

        return (
          <div
            key={lead.id}
            className="bg-white rounded-lg p-3 shadow-sm border border-blue-100 ring-1 ring-blue-200"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">נכנס</span>
              {score !== undefined && (
                <span className="text-xs text-gray-500">{score}/10 ★</span>
              )}
            </div>
            <div className="font-semibold text-gray-900 text-sm" dir="ltr">{f.phone_number ?? '—'}</div>
            {isAdmin && f.phone_my_user && (
              <div className="text-xs text-gray-400 mt-0.5" dir="ltr">{f.phone_my_user}</div>
            )}
            {f['Call Summary'] && (
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">{f['Call Summary']}</div>
            )}
            {callResult && (
              <div className={`text-xs mt-1 rounded px-1.5 py-0.5 ${callResult.success ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'}`}>
                {callResult.success ? '✓ חוייג' : `✗ ${callResult.error}`}
              </div>
            )}
            <button
              onClick={() => handleCall(lead)}
              disabled={isCalling || !f.phone_number}
              className="mt-2 w-full bg-blue-600 text-white text-xs font-medium py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {isCalling ? '📞 מחייג...' : '📞 חייג'}
            </button>
          </div>
        )
      })}
    </>
  )
}
