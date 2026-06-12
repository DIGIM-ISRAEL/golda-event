'use client'

import { useState, useEffect, useCallback } from 'react'

interface AirtableFields {
  'שם מלא'?: string
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

interface Props {
  isAdmin: boolean
  hasPhone: boolean
}

function QualityStars({ score }: { score?: number }) {
  if (!score) return <span className="text-brand-muted text-xs">לא דורג</span>
  const filled = Math.round((score / 10) * 5)
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= filled ? 'text-brand-gold' : 'text-brand-line'}>★</span>
      ))}
      <span className="text-xs text-brand-muted mr-1">{score}/10</span>
    </div>
  )
}

export default function AirtableLeadsClient({ isAdmin, hasPhone }: Props) {
  const canLoad = isAdmin || hasPhone

  const [leads, setLeads] = useState<AirtableLead[]>([])
  const [loading, setLoading] = useState(canLoad)
  const [error, setError] = useState('')
  const [callingId, setCallingId] = useState<string | null>(null)
  const [callResults, setCallResults] = useState<Record<string, { success: boolean; error?: string }>>({})

  const fetchLeads = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/airtable/leads')
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'שגיאה בטעינת לידים')
        return
      }
      setLeads(data)
    } catch {
      setError('שגיאת רשת')
    } finally {
      setLoading(false)
    }
  }, [])

  // טעינה ראשונית — כל עדכוני ה-state קורים אחרי await (callback אסינכרוני)
  useEffect(() => {
    if (!canLoad) return
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch('/api/airtable/leads')
        const data = await res.json()
        if (cancelled) return
        if (!res.ok) setError(data.error ?? 'שגיאה בטעינת לידים')
        else setLeads(data)
      } catch {
        if (!cancelled) setError('שגיאת רשת')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [canLoad])

  async function handleCall(lead: AirtableLead) {
    const phone = lead.fields.phone_number
    if (!phone) { alert('אין מספר טלפון לליד זה'); return }

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

  if (!canLoad) {
    return (
      <div className="p-6 max-w-3xl mx-auto" dir="rtl">
        <h1 className="text-2xl font-bold text-brand-ink mb-4">לידים חיצוניים</h1>
        <div className="bg-[#F8F0DF] border border-brand-gold/30 rounded-xl p-5 text-brand-gold-deep">
          <p className="font-semibold mb-1">לא הוגדר מספר טלפון בפרופיל שלך</p>
          <p className="text-sm">בקש ממנהל המערכת להגדיר מספר טלפון לחשבונך תחת ניהול → משתמשים.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto" dir="rtl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-ink">לידים חיצוניים</h1>
          {isAdmin && <p className="text-sm text-brand-muted mt-0.5">מציג את כל הלידים (מנהל)</p>}
        </div>
        <button
          onClick={fetchLeads}
          disabled={loading}
          className="text-sm text-brand-maroon hover:underline disabled:opacity-50"
        >
          {loading ? 'טוען...' : '↻ רענן'}
        </button>
      </div>

      {error && (
        <div className="bg-brand-maroon/5 border border-brand-maroon/20 rounded-xl p-4 text-brand-maroon text-sm mb-4">{error}</div>
      )}

      {loading && <div className="text-center text-brand-muted py-16">טוען לידים מ-Airtable...</div>}

      {!loading && !error && leads.length === 0 && (
        <div className="text-center text-brand-muted py-16">אין לידים להצגה</div>
      )}

      {!loading && leads.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {leads.map((lead) => {
            const f = lead.fields
            const callResult = callResults[lead.id]
            const isCalling = callingId === lead.id

            return (
              <div key={lead.id} className="bg-white rounded-2xl border border-brand-line p-4 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)] flex flex-col gap-3">
                <div>
                  {f['שם מלא'] && (
                    <div className="text-sm font-bold text-brand-ink mb-0.5">{f['שם מלא']}</div>
                  )}
                  <div className="text-sm font-semibold text-brand-ink mb-1" dir="ltr">
                    {f.phone_number ?? '—'}
                  </div>
                  {isAdmin && f.phone_my_user && (
                    <div className="text-xs text-brand-muted" dir="ltr">נציג: {f.phone_my_user}</div>
                  )}
                  <QualityStars score={f['Lead Quality Score']} />
                </div>

                {f['Call Summary'] && (
                  <div className="text-xs text-brand-muted bg-brand-cream/60 rounded-lg p-2 leading-relaxed max-h-20 overflow-y-auto">
                    {f['Call Summary']}
                  </div>
                )}

                {callResult && (
                  <div className={`text-xs rounded-lg px-3 py-2 ${callResult.success ? 'bg-[#E7EDE4] text-[#4A6B41]' : 'bg-brand-maroon/5 text-brand-maroon'}`}>
                    {callResult.success ? '✓ חיוג יצא בהצלחה' : `✗ ${callResult.error}`}
                  </div>
                )}

                <div className="mt-auto flex gap-2">
                  <button
                    onClick={() => handleCall(lead)}
                    disabled={isCalling || !f.phone_number}
                    className="flex-1 bg-brand-maroon text-white text-sm font-medium py-2 rounded-lg hover:bg-brand-maroon-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCalling ? '📞 מחייג...' : '📞 חייג'}
                  </button>
                  <a
                    href={`/leads/new?name=${encodeURIComponent(String(f['שם מלא'] ?? ''))}&phone=${encodeURIComponent(f.phone_number ?? '')}`}
                    className="flex-1 text-center bg-white border border-brand-gold/40 text-brand-gold-deep text-sm font-medium py-2 rounded-lg hover:bg-brand-cream/60 transition-colors"
                  >
                    + צור ליד
                  </a>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
