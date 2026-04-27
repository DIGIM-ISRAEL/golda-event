'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
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
  const savedStatus = useRef<string | null>(null)

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
    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {STATUSES.map((status) => {
        const col = leads.filter((l) => l.status === status)
        const isOver = dragOver === status && draggingId !== null

        return (
          <div
            key={status}
            onDragOver={(e) => onDragOver(e, status)}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOver(null)
            }}
            onDrop={(e) => onDrop(e, status)}
            className={`rounded-xl p-3 min-h-[8rem] transition-colors ${
              isOver ? 'bg-blue-50 ring-2 ring-blue-300' : 'bg-gray-100'
            }`}
          >
            <div className="flex items-center justify-between mb-3">
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${LEAD_STATUS_COLORS[status]}`}
              >
                {LEAD_STATUS_LABELS[status]}
              </span>
              <span className="text-xs text-gray-500">{col.length}</span>
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
                    className="block bg-white rounded-lg p-3 shadow-sm hover:shadow-md transition-shadow border border-gray-100 cursor-grab active:cursor-grabbing select-none"
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <div className="font-semibold text-gray-900 text-sm leading-tight">{lead.clientName}</div>
                      {lead.airtableRecordId && (
                        <span className="shrink-0 text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
                          נכנס
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500">{formatDate(lead.eventDate)}</div>
                    <div className="text-xs text-gray-500">{lead.participants} נפש</div>
                    {lead.location?.cityName && (
                      <div className="text-xs text-gray-400 mt-1">📍 {lead.location.cityName}</div>
                    )}
                    <div className="mt-2 flex gap-1 flex-wrap">
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {CLIENT_TYPE_LABELS[lead.clientType]}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {EVENT_TYPE_LABELS[lead.eventType]}
                      </span>
                    </div>
                  </Link>
                </div>
              ))}

              {col.length === 0 && (
                <div className="text-xs text-gray-400 text-center py-4">ריק</div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
