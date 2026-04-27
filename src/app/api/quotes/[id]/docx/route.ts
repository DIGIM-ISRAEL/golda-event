import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  Document, Packer, Paragraph, Table, TableRow, TableCell,
  TextRun, AlignmentType, WidthType, BorderStyle, HeadingLevel,
} from 'docx'
import { formatNIS } from '@/lib/pricing'
import { formatDate, formatTime } from '@/lib/utils'
import { EVENT_TYPE_LABELS } from '@/lib/constants'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: lead } = await supabase
    .from('leads')
    .select('*, location:locations(*), flavors:lead_flavors(flavor:flavors(*)), quote:quotes(*)')
    .eq('id', id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const quote = Array.isArray(lead.quote) ? lead.quote[0] : lead.quote
  const flavors = lead.flavors?.map((f: { flavor: { name: string } }) => f.flavor.name).join(', ') ?? '—'

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: 'גולדה אירועים — הצעת מחיר',
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: `לקוח: ${lead.client_name}` })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [new TextRun({ text: `טלפון: ${lead.client_phone}` })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [new TextRun({ text: `תאריך: ${formatDate(lead.event_date)}` })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [new TextRun({ text: `שעות: ${formatTime(lead.start_time)} – ${formatTime(lead.end_time)}` })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [new TextRun({ text: `מיקום: ${lead.location?.city_name ?? '—'}` })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [new TextRun({ text: `משתתפים: ${lead.participants}` })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [new TextRun({ text: `סוג אירוע: ${EVENT_TYPE_LABELS[lead.event_type]}` })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ text: '' }),
          new Paragraph({
            text: 'טעמים שנבחרו:',
            heading: HeadingLevel.HEADING_2,
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({
            children: [new TextRun({ text: flavors })],
            alignment: AlignmentType.RIGHT,
          }),
          new Paragraph({ text: '' }),
          ...(quote ? [
            new Paragraph({
              text: 'תמחור:',
              heading: HeadingLevel.HEADING_2,
              alignment: AlignmentType.RIGHT,
            }),
            ...(lead.client_type === 'institutional' && quote.vat_amount != null ? [
              new Paragraph({
                children: [new TextRun({ text: `מחיר לפני מע"מ: ${formatNIS(quote.total_price - quote.vat_amount)}` })],
                alignment: AlignmentType.RIGHT,
              }),
              new Paragraph({
                children: [new TextRun({ text: `מע"מ (18%): ${formatNIS(quote.vat_amount)}` })],
                alignment: AlignmentType.RIGHT,
              }),
            ] : []),
            new Paragraph({
              children: [new TextRun({ text: `סה"כ לתשלום: ${formatNIS(quote.total_price)}`, bold: true })],
              alignment: AlignmentType.RIGHT,
            }),
            ...(quote.advance_paid > 0 ? [
              new Paragraph({
                children: [new TextRun({ text: `מקדמה: ${formatNIS(quote.advance_paid)}` })],
                alignment: AlignmentType.RIGHT,
              }),
              new Paragraph({
                children: [new TextRun({ text: `יתרה לתשלום: ${formatNIS(quote.balance_due)}`, bold: true })],
                alignment: AlignmentType.RIGHT,
              }),
            ] : []),
          ] : []),
          new Paragraph({ text: '' }),
          new Paragraph({
            children: [new TextRun({ text: '* ההצעה בתוקף ל-14 יום. ביטול עד 72 שעות לפני האירוע — ללא חיוב.', size: 18, color: '6B7280' })],
            alignment: AlignmentType.RIGHT,
          }),
        ],
      },
    ],
  })

  const buffer = await Packer.toBuffer(doc)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="quote-${lead.client_name}.docx"`,
    },
  })
}
