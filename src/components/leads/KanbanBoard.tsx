'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Search, MapPin } from 'lucide-react'
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  CLIENT_TYPE_LABELS,
  EVENT_TYPE_LABELS,
} from '@/lib/constants'
import { formatDate } from '@/lib/utils'

interface KanbanLead {
  id: string
  clientName: string
  clientPhone: string
  eventDate: string
  participants: number
  status: string
  clientType: string
  eventType: string
  airtableRecordId: string | null
  location: { cityName: string } | null
  quote: { totalPrice: number } | null
}

interface Props {
  initialLeads: KanbanLead[]
}

const STATUSES = ['lead', 'quote_sent', 'closed', 'done', 'canceled']

export default function KanbanBoard({ initialLeads }: Props) {
  const [leads, setLeads] = useState(initialLeads)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const savedStatus = useRef<string | null>(null)

  const query = search.trim().toLowerCase()
  const queryDigits = query.replace(/\D/g, '')
  function matchesSearch(lead: KanbanLead) {
    if (!query) return true
    return (
      lead.clientName.toLowerCase().includes(query) ||
      (lead.location?.cityName ?? '').toLowerCase().includes(query) ||
      (queryDigits.length >= 3 && lead.clientPhone.replace(/\D/g, '').includes(queryDigits))
    )
  }

  function onDragStart(e: React.DragEvent, lead: KanbanLead) {
    e.dataTransfer.effectAllowed = 'move'
    savedStatus.current = lead.status
    setDraggingId(lead.id)
  }

  function onDragOver(e: React.DragEvent, status: string) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragOver !== status) setDragOver(status)
  }

  function onDragEnd() {
    setDraggingId(null)
    setDragOver(null)
  }

  async function onDrop(e: React.DragEvent, newStatus: string) {
    e.preventDefault()
    setDragOver(null)
    const id = draggingId
    const prevStatus = savedStatus.current
    setDraggingId(null)
    savedStatus.current = null
    if (!id || !prevStatus || prevStatus === newStatus) return

    setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: newStatus } : l)))

    const res = await fetch(`/api/leads/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (!res.ok) {
      setLeads((prev) => prev.map((l) => (l.id === id ? { ...l, status: prevStatus } : l)))
    }
  }

  return (
    <div>
      {/* חיפוש */}
      <div className="relative mb-5 max-w-sm">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-muted/70" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="חיפוש לפי שם, עיר או טלפון…"
          className="w-full rounded-xl border border-brand-line bg-white pr-9 pl-3 py-2.5 text-sm text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 transition"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {STATUSES.map((status) => {
        const col = leads.filter((l) => l.status === status && matchesSearch(l))
        const isOver = dragOver === status && draggingId !== null

        return (
          <div
            key={status}
            onDragOver={(e) => onDragOver(e, status)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null)
            }}
            onDrop={(e) => onDrop(e, status)}
            className={`rounded-2xl p-3 min-h-[8rem] border transition-colors ${
              isOver
                ? 'bg-brand-mint/40 border-brand-gold/50 ring-2 ring-brand-gold/30'
                : 'bg-brand-cream/40 border-brand-line/70'
            }`}
          >
            <div className="flex items-center justify-between mb-3 px-0.5">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEAD_STATUS_COLORS[status]}`}
              >
                {LEAD_STATUS_LABELS[status]}
              </span>
              <span className="text-xs font-medium text-brand-muted/70">{col.length}</span>
            </div>

            <div className="space-y-2">
              {col.map((lead) => (
                <div
                  key={lead.id}
                  draggable
                  onDragStart={(e) => onDragStart(e, lead)}
                  onDragEnd={onDragEnd}
                  className={`transition-opacity ${draggingId === lead.id ? 'opacity-40' : 'opacity-100'}`}
                >
                  <Link
                    href={`/leads/${lead.id}`}
                    draggable={false}
                    className="block bg-white rounded-xl p-3 shadow-[0_1px_2px_rgba(93,42,49,0.04)] hover:shadow-[0_8px_24px_-16px_rgba(93,42,49,0.30)] hover:border-brand-gold/40 transition-all border border-brand-line cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                      <div className="font-semibold text-brand-ink text-sm leading-tight">{lead.clientName}</div>
                      {lead.airtableRecordId && (
                        <span className="shrink-0 text-[10px] bg-[#E2EEDD] text-[#436B36] px-1.5 py-0.5 rounded-md font-semibold">
                          נכנס
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-brand-muted">{formatDate(lead.eventDate)} · {lead.participants} נפש</div>
                    {lead.location?.cityName && (
                      <div className="flex items-center gap-1 text-xs text-brand-muted/80 mt-1">
                        <MapPin size={11} className="text-brand-gold/70 shrink-0" />
                        {lead.location.cityName}
                      </div>
                    )}
                    <div className="mt-2.5 flex gap-1 flex-wrap">
                      <span className="text-[11px] bg-brand-cream text-brand-muted px-2 py-0.5 rounded-md border border-brand-line/60">
                        {CLIENT_TYPE_LABELS[lead.clientType]}
                      </span>
                      <span className="text-[11px] bg-brand-cream text-brand-muted px-2 py-0.5 rounded-md border border-brand-line/60">
                        {EVENT_TYPE_LABELS[lead.eventType]}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}

              {col.length === 0 && (
                <div className="text-xs text-brand-muted/50 text-center py-5">ריק</div>
              )}
            </div>
          </div>
        )
      })}
      </div>
    </div>
  )
}
