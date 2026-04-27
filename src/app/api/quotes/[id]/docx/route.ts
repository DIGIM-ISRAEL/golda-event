import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import {
  Document, Packer, Paragraph,
  TextRun, AlignmentType, HeadingLevel,
} from 'docx'
import { formatNIS } from '@/lib/pricing'
import { formatDate, formatTime } from '@/lib/utils'
import { EVENT_TYPE_LABELS } from '@/lib/constants'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  const lead = await db.lead.findUnique({
    where: { id },
    include: {
      location: true,
      quote: true,
      flavors: { include: { flavor: true } },
    },
  })

  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const flavorNames = lead.flavors.map((lf) => lf.flavor.name).join(', ') || '—'

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'גולדה אירועים — הצעת מחיר', heading: HeadingLevel.HEADING_1, alignment: AlignmentType.RIGHT }),
        new Paragraph({ text: '' }),
        new Paragraph({ children: [new TextRun({ text: `לקוח: ${lead.clientName}` })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: `טלפון: ${lead.clientPhone}` })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: `תאריך: ${formatDate(lead.eventDate)}` })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: `שעות: ${formatTime(lead.startTime)} – ${formatTime(lead.endTime)}` })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: `מיקום: ${lead.location?.cityName ?? '—'}` })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: `משתתפים: ${lead.participants}` })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: `סוג אירוע: ${EVENT_TYPE_LABELS[lead.eventType]}` })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: 'טעמים שנבחרו:', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: flavorNames })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ text: '' }),
        ...(lead.quote ? [
          new Paragraph({ text: 'תמחור:', heading: HeadingLevel.HEADING_2, alignment: AlignmentType.RIGHT }),
          ...(lead.clientType === 'institutional' && lead.quote.vatAmount != null ? [
            new Paragraph({ children: [new TextRun({ text: `מחיר לפני מע"מ: ${formatNIS(lead.quote.totalPrice - lead.quote.vatAmount)}` })], alignment: AlignmentType.RIGHT }),
            new Paragraph({ children: [new TextRun({ text: `מע"מ (18%): ${formatNIS(lead.quote.vatAmount)}` })], alignment: AlignmentType.RIGHT }),
          ] : []),
          new Paragraph({ children: [new TextRun({ text: `סה"כ לתשלום: ${formatNIS(lead.quote.totalPrice)}`, bold: true })], alignment: AlignmentType.RIGHT }),
          ...(lead.quote.advancePaid > 0 ? [
            new Paragraph({ children: [new TextRun({ text: `מקדמה: ${formatNIS(lead.quote.advancePaid)}` })], alignment: AlignmentType.RIGHT }),
            new Paragraph({ children: [new TextRun({ text: `יתרה לתשלום: ${formatNIS(lead.quote.balanceDue)}`, bold: true })], alignment: AlignmentType.RIGHT }),
          ] : []),
        ] : []),
        new Paragraph({ text: '' }),
        new Paragraph({ children: [new TextRun({ text: '* ההצעה בתוקף ל-14 יום. ביטול עד 72 שעות לפני האירוע — ללא חיוב.', size: 18, color: '6B7280' })], alignment: AlignmentType.RIGHT }),
      ],
    }],
  })

  const buffer = await Packer.toBuffer(doc)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="quote-${lead.clientName}.docx"`,
    },
  })
}
