'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/constants'
import type { LeadStatus } from '@/lib/types'

const STATUS_FLOW: LeadStatus[] = ['lead', 'quote_sent', 'closed', 'done', 'canceled']

interface Props {
  leadId: string
  currentStatus: LeadStatus
}

export default function StatusChanger({ leadId, currentStatus }: Props) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function changeStatus(newStatus: LeadStatus) {
    setLoading(true)
    setError('')
    const res = await fetch(`/api/leads/${leadId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'שגיאה בעדכון סטטוס')
    } else {
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 text-sm">עדכון סטטוס</h3>
        {loading && <span className="text-xs text-brand-gold">מעדכן...</span>}
      </div>
      <div className="space-y-2">
        {STATUS_FLOW.map((status) => (
          <button
            key={status}
            onClick={() => changeStatus(status)}
            disabled={loading || status === currentStatus}
            className={`w-full text-right px-3 py-2.5 rounded-lg text-sm font-medium transition-colors border ${
              status === currentStatus
                ? `${LEAD_STATUS_COLORS[status]} border-transparent cursor-default`
                : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
            }`}
          >
            {status === currentStatus && '✓ '}
            {LEAD_STATUS_LABELS[status]}
          </button>
        ))}
      </div>
      {error && (
        <div className="mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </div>
  )
}
