import Link from 'next/link'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { syncAirtableLeadsToDb } from '@/lib/airtable'
import KanbanBoard from '@/components/leads/KanbanBoard'
import { toWhatsAppNumber, formatDate, formatTime } from '@/lib/utils'
import { formatNIS } from '@/lib/pricing'
import { parseWaTemplates, fillWaTemplate } from '@/lib/wa-templates'

export const dynamic = 'force-dynamic'

export default async function LeadsPage() {
  // Sync Airtable leads into DB (non-blocking — errors are silently ignored)
  if (process.env.AIRTABLE_API_KEY) {
    try {
      const session = await getSession()
      if (session) {
        let phones: string[] = []
        if (session.role === 'admin') {
          const users = await db.user.findMany({
            where: { phoneNumber: { not: null } },
            select: { phoneNumber: true },
          })
          phones = users.map((u) => u.phoneNumber!)
        } else if (session.phoneNumber) {
          phones = [session.phoneNumber]
        }
        if (phones.length > 0) await syncAirtableLeadsToDb(phones, db)
      }
    } catch {
      // Airtable errors must not break the page
    }
  }

  // תבניות הודעה לוואטסאפ — מהגדרות (או ברירת מחדל), ממולאות לכל ליד
  const settingsRows = await db.settings.findMany().catch(() => [] as { key: string; value: string }[])
  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))
  const templates = parseWaTemplates(settingsMap['wa_templates'])
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  let leads: {
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
    waNumber: string
    waMessages: { title: string; text: string }[]
  }[] = []

  try {
    const raw = await db.lead.findMany({
      select: {
        id: true,
        clientName: true,
        clientPhone: true,
        eventDate: true,
        startTime: true,
        participants: true,
        status: true,
        clientType: true,
        eventType: true,
        airtableRecordId: true,
        signatureToken: true,
        location: { select: { cityName: true } },
        quote: { select: { totalPrice: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
    leads = raw.map((l) => {
      const vars = {
        name: l.clientName,
        dateLabel: formatDate(l.eventDate),
        timeLabel: formatTime(l.startTime),
        cityName: l.location?.cityName ?? null,
        priceLabel: l.quote ? formatNIS(l.quote.totalPrice) : '',
        approveUrl: `${appUrl}/approve/${l.signatureToken}`,
      }
      return {
        id: l.id,
        clientName: l.clientName,
        clientPhone: l.clientPhone,
        eventDate: l.eventDate,
        participants: l.participants,
        status: l.status as string,
        clientType: l.clientType as string,
        eventType: l.eventType as string,
        airtableRecordId: l.airtableRecordId,
        location: l.location,
        quote: l.quote,
        waNumber: toWhatsAppNumber(l.clientPhone),
        waMessages: templates.map((t) => ({ title: t.title, text: fillWaTemplate(t.body, vars) })),
      }
    })
  } catch {
    // DB error — render empty board
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-brand-ink">לידים</h1>
        <Link
          href="/leads/new"
          className="bg-brand-maroon text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-maroon-dark transition-colors"
        >
          + ליד חדש
        </Link>
      </div>

      <KanbanBoard initialLeads={leads} />
    </div>
  )
}
