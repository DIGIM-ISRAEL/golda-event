'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { Card, CardHeader } from '@/components/ui'
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
    <Card>
      <CardHeader
        title="עדכון סטטוס"
        action={loading ? <span className="text-xs text-brand-gold">מעדכן…</span> : undefined}
      />
      <div className="p-4 space-y-2">
        {STATUS_FLOW.map((status) => {
          const isCurrent = status === currentStatus
          return (
            <button
              key={status}
              onClick={() => changeStatus(status)}
              disabled={loading || isCurrent}
              className={cn(
                'w-full flex items-center gap-2 text-right px-3 py-2.5 rounded-xl text-sm font-medium border transition-colors',
                isCurrent
                  ? `${LEAD_STATUS_COLORS[status]} border-transparent cursor-default`
                  : 'bg-white text-brand-muted border-brand-line hover:bg-brand-cream/60 hover:text-brand-ink',
              )}
            >
              {isCurrent && <Check size={15} strokeWidth={3} className="shrink-0" />}
              {LEAD_STATUS_LABELS[status]}
            </button>
          )
        })}
      </div>
      {error && (
        <div className="mx-4 mb-4 text-xs text-brand-maroon bg-brand-maroon/5 border border-brand-maroon/15 rounded-lg px-3 py-2">
          {error}
        </div>
      )}
    </Card>
  )
}
