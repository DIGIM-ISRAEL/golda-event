'use client'

import { useState, useEffect } from 'react'

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

function QualityStars({ score }: { score?: number }) {
  if (!score) return null
  const filled = Math.round((score / 10) * 5)
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={i <= filled ? 'text-yellow-400 text-xs' : 'text-gray-200 text-xs'}>★</span>
      ))}
      <span className="text-xs text-gray-500 mr-1">{score}/10</span>
    </div>
  )
}

function LeadModal({
  lead,
  onClose,
  onCall,
  calling,
  callResult,
}: {
  lead: AirtableLead
  onClose: () => void
  onCall: (lead: AirtableLead) => void
  calling: boolean
  callResult?: { success: boolean; error?: string }
}) {
  const f = lead.fields
  const name = f['שם מלא'] || f.phone_number || '—'

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 p-6"
        dir="rtl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="font-bold text-gray-900 text-lg">{name}</div>
            <span className="text-xs font-medium bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
              ליד נכנס
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        <div className="space-y-3 text-sm">
          {f.phone_number && (
            <div className="flex justify-between">
              <span className="text-gray-500">טלפון</span>
              <span className="font-medium" dir="ltr">{f.phone_number}</span>
            </div>
          )}
          {f.phone_my_user && (
            <div className="flex justify-between">
              <span className="text-gray-500">נציג</span>
              <span className="font-medium" dir="ltr">{f.phone_my_user}</span>
            </div>
          )}
          {f['Lead Quality Score'] !== undefined && (
            <div className="flex justify-between items-center">
              <span className="text-gray-500">ציון</span>
              <QualityStars score={f['Lead Quality Score']} />
            </div>
          )}
          {f['Call Summary'] && (
            <div>
              <div className="text-gray-500 mb-1">סיכום שיחה</div>
              <div className="bg-gray-50 rounded-lg p-3 text-gray-700 text-xs leading-relaxed">
                {f['Call Summary']}
              </div>
            </div>
          )}
        </div>

        {callResult && (
          <div
            className={`mt-4 text-xs rounded-lg px-3 py-2 ${
              callResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
            }`}
          >
            {callResult.success ? '✓ חיוג יצא בהצלחה' : `✗ ${callResult.error}`}
          </div>
        )}

        <div className="mt-5 flex gap-2">
          <button
            onClick={() => onCall(lead)}
            disabled={calling || !f.phone_number}
            className="flex-1 bg-blue-600 text-white text-sm font-medium py-2.5 rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {calling ? '📞 מחייג...' : '📞 חייג'}
          </button>
          <a
            href={`/leads/new?name=${encodeURIComponent(f['שם מלא'] ?? '')}&phone=${encodeURIComponent(f.phone_number ?? '')}`}
            className="flex-1 text-center bg-gray-100 text-gray-700 text-sm font-medium py-2.5 rounded-xl hover:bg-gray-200 transition-colors"
          >
            + צור ליד
          </a>
        </div>
      </div>
    </div>
  )
}

export default function IncomingLeadCards() {
  const [leads, setLeads] = useState<AirtableLead[]>([])
  const [selected, setSelected] = useState<AirtableLead | null>(null)
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
              if (selected?.id === updated.id) setSelected(updated)
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
      {selected && (
        <LeadModal
          lead={selected}
          onClose={() => setSelected(null)}
          onCall={handleCall}
          calling={callingId === selected.id}
          callResult={callResults[selected.id]}
        />
      )}

      {leads.map((lead) => {
        const f = lead.fields
        const callResult = callResults[lead.id]
        const isCalling = callingId === lead.id
        const name = f['שם מלא'] || f.phone_number || '—'
        const score = f['Lead Quality Score']

        return (
          <div
            key={lead.id}
            className="bg-white rounded-lg p-3 shadow-sm border border-blue-100 ring-1 ring-blue-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => setSelected(lead)}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">נכנס</span>
              {score !== undefined && <QualityStars score={score} />}
            </div>
            <div className="font-semibold text-gray-900 text-sm">{name}</div>
            {f.phone_number && (
              <div className="text-xs text-gray-400 mt-0.5" dir="ltr">{f.phone_number}</div>
            )}
            {f['Call Summary'] && (
              <div className="text-xs text-gray-500 mt-1 line-clamp-2">{f['Call Summary']}</div>
            )}
            {callResult && (
              <div
                className={`text-xs mt-1 rounded px-1.5 py-0.5 ${
                  callResult.success ? 'text-green-700 bg-green-50' : 'text-red-600 bg-red-50'
                }`}
              >
                {callResult.success ? '✓ חוייג' : `✗ ${callResult.error}`}
              </div>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleCall(lead) }}
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
