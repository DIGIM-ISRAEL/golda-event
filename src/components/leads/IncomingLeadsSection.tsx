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
        className="flex items-center gap-2 mb-3 text-sm font-semibold text-brand-ink hover:text-brand-ink"
      >
        <span className="text-[#4F7A43]">●</span>
        לידים נכנסים ({leads.length})
        {isAdmin && <span className="text-xs font-normal text-brand-muted">כל הנציגים</span>}
        <span className="text-brand-muted text-xs">{open ? '▲' : '▼'}</span>
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
                className="shrink-0 w-52 bg-white rounded-2xl border border-brand-line p-3 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)] flex flex-col gap-2"
              >
                <div className="text-sm font-semibold text-brand-ink" dir="ltr">{f.phone_number ?? '—'}</div>
                {isAdmin && f.phone_my_user && (
                  <div className="text-xs text-brand-muted" dir="ltr">{f.phone_my_user}</div>
                )}
                {score !== undefined && (
                  <div className="flex items-center gap-0.5">
                    {[1,2,3,4,5].map((i) => (
                      <span key={i} className={i <= Math.round((score/10)*5) ? 'text-brand-gold text-sm' : 'text-brand-line text-sm'}>★</span>
                    ))}
                    <span className="text-xs text-brand-muted mr-1">{score}/10</span>
                  </div>
                )}
                {f['Call Summary'] && (
                  <div className="text-xs text-brand-muted line-clamp-2">{f['Call Summary']}</div>
                )}
                {callResult && (
                  <div className={`text-xs rounded px-2 py-1 ${callResult.success ? 'bg-[#E7EDE4] text-[#4A6B41]' : 'bg-brand-maroon/5 text-brand-maroon'}`}>
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
