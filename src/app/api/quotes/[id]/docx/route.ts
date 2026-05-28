import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import {
  Document, Packer, Paragraph, TextRun, AlignmentType,
  Table, TableRow, TableCell, WidthType, BorderStyle, ShadingType,
} from 'docx'
import { formatNIS } from '@/lib/pricing'
import { formatDate, formatTime } from '@/lib/utils'
import { EVENT_TYPE_LABELS, DEFAULT_INCLUDED_ITEMS } from '@/lib/constants'
import { BRAND, BRAND_TAGLINE } from '@/lib/brand'

// צבעים ל-docx (ללא #)
const C = {
  gold: BRAND.gold.replace('#', ''),
  maroon: BRAND.maroon.replace('#', ''),
  ink: BRAND.ink.replace('#', ''),
  gray: BRAND.gray.replace('#', ''),
  mint: BRAND.mint.replace('#', ''),
  cream: BRAND.cream.replace('#', ''),
  tan: BRAND.tan.replace('#', ''),
}
const FONT = 'Arial'

function heading(text: string) {
  return new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, font: FONT, bold: true, size: 26, color: C.gold, rightToLeft: true })],
  })
}

function detailRow(label: string, value: string) {
  const cell = (text: string, opts: { bold?: boolean; color?: string } = {}) =>
    new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      margins: { top: 60, bottom: 60, left: 120, right: 120 },
      children: [new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        children: [new TextRun({ text, font: FONT, size: 22, bold: opts.bold, color: opts.color ?? C.ink, rightToLeft: true })],
      })],
    })
  // RTL: ערך משמאל, תווית מימין → בטבלת RTL התא הראשון מופיע מימין
  return new TableRow({ children: [cell(value, { bold: true }), cell(label, { color: C.gray })] })
}

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.SINGLE, size: 4, color: C.tan },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: C.tan },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
}

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

  const flavorNames = lead.flavors.map((lf) => lf.flavor.name).join(' · ') || '—'
  const includes = lead.includedItems.length > 0 ? lead.includedItems : DEFAULT_INCLUDED_ITEMS

  const children: (Paragraph | Table)[] = [
    // כותרת GOLDA
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 40 },
      children: [new TextRun({ text: 'GOLDA', font: 'Georgia', bold: true, size: 56, color: C.gold, characterSpacing: 60 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: BRAND_TAGLINE, font: FONT, size: 14, color: C.gold, characterSpacing: 30 })],
    }),

    // כותרת ראשית
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 160 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: C.gold, space: 6 } },
      children: [new TextRun({ text: 'הצעת מחיר', font: FONT, bold: true, size: 40, color: C.maroon, rightToLeft: true })],
    }),

    // פרטי האירוע
    heading('פרטי האירוע'),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [
        detailRow('שם הלקוח', lead.clientName),
        detailRow('טלפון', lead.clientPhone),
        detailRow('תאריך', formatDate(lead.eventDate)),
        detailRow('שעות', `${formatTime(lead.startTime)} – ${formatTime(lead.endTime)}`),
        detailRow('מיקום', lead.location?.cityName ?? '—'),
        detailRow('מספר משתתפים', `${lead.participants}`),
        detailRow('סוג אירוע', EVENT_TYPE_LABELS[lead.eventType]),
      ],
    }),

    // מה ההצעה כוללת
    heading('מה ההצעה כוללת'),
    ...includes.map((item) =>
      new Paragraph({
        bidirectional: true,
        alignment: AlignmentType.RIGHT,
        spacing: { after: 60 },
        children: [new TextRun({ text: `•  ${item}`, font: FONT, size: 22, color: C.ink, rightToLeft: true })],
      }),
    ),

    // טעמים
    heading('הטעמים שנבחרו'),
    new Paragraph({
      bidirectional: true,
      alignment: AlignmentType.RIGHT,
      spacing: { after: 120 },
      children: [new TextRun({ text: flavorNames, font: FONT, size: 22, color: C.ink, rightToLeft: true })],
    }),
  ]

  // תמחור
  if (lead.quote) {
    children.push(heading('תמחור'))
    const priceRows: TableRow[] = []
    if (lead.clientType === 'institutional' && lead.quote.vatAmount != null) {
      priceRows.push(detailRow('מחיר לפני מע"מ', formatNIS(lead.quote.totalPrice - lead.quote.vatAmount)))
      priceRows.push(detailRow('מע"מ (18%)', formatNIS(lead.quote.vatAmount)))
    }
    // שורת סה"כ מודגשת עם רקע קרם
    const totalCell = (text: string, color: string) =>
      new TableCell({
        width: { size: 50, type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.SOLID, color: C.cream, fill: C.cream },
        margins: { top: 100, bottom: 100, left: 120, right: 120 },
        children: [new Paragraph({
          bidirectional: true, alignment: AlignmentType.RIGHT,
          children: [new TextRun({ text, font: FONT, bold: true, size: 28, color, rightToLeft: true })],
        })],
      })
    priceRows.push(new TableRow({ children: [totalCell(formatNIS(lead.quote.totalPrice), C.gold), totalCell('סה"כ לתשלום', C.maroon)] }))
    if (lead.quote.advancePaid > 0) {
      priceRows.push(detailRow('מקדמה ששולמה', formatNIS(lead.quote.advancePaid)))
      priceRows.push(detailRow('יתרה לתשלום', formatNIS(lead.quote.balanceDue)))
    }
    children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: noBorders, rows: priceRows }))
  }

  // תנאים + חתימה
  children.push(
    new Paragraph({
      bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { before: 240, after: 240 },
      children: [new TextRun({
        text: 'ההצעה בתוקף ל-14 יום ממועד הוצאתה. ביטול עד 72 שעות לפני האירוע — ללא חיוב. ביטול בפחות מ-72 שעות — חיוב 50% מערך ההזמנה.',
        font: FONT, size: 16, color: C.gray, rightToLeft: true,
      })],
    }),
    new Paragraph({
      bidirectional: true, alignment: AlignmentType.RIGHT, spacing: { before: 360, after: 120 },
      children: [new TextRun({ text: 'חתימת הלקוח: ___________________          תאריך: ______________', font: FONT, size: 22, color: C.ink, rightToLeft: true })],
    }),
  )

  const doc = new Document({
    sections: [{ properties: {}, children }],
  })

  const buffer = await Packer.toBuffer(doc)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="golda-quote-${lead.id}.docx"`,
    },
  })
}
