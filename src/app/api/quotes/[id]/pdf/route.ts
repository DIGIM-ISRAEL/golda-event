import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { renderQuotePdf } from '@/lib/quote-pdf'
import { formatDate, formatTime } from '@/lib/utils'
import { EVENT_TYPE_LABELS, DEFAULT_INCLUDED_ITEMS } from '@/lib/constants'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const lead = await db.lead.findUnique({
    where: { id },
    include: { location: true, quote: true, flavors: { include: { flavor: true } } },
  })

  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const pdfBuffer = await renderQuotePdf({
    clientName: lead.clientName,
    clientPhone: lead.clientPhone,
    eventDateLabel: formatDate(lead.eventDate),
    startTimeLabel: formatTime(lead.startTime),
    endTimeLabel: formatTime(lead.endTime),
    cityName: lead.location?.cityName ?? null,
    participants: lead.participants,
    eventTypeLabel: EVENT_TYPE_LABELS[lead.eventType],
    isInstitutional: lead.clientType === 'institutional',
    todayLabel: new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }),
    includedItems: lead.includedItems.length > 0 ? lead.includedItems : DEFAULT_INCLUDED_ITEMS,
    flavors: lead.flavors.map((lf) => lf.flavor.name),
    pricing: lead.quote
      ? {
          totalPrice: lead.quote.totalPrice,
          vatAmount: lead.quote.vatAmount,
          advancePaid: lead.quote.advancePaid,
          balanceDue: lead.quote.balanceDue,
        }
      : null,
  })

  // inline — נפתח לצפייה בדפדפן (אפשר עדיין להוריד משם)
  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="golda-quote-${lead.id}.pdf"`,
    },
  })
}
