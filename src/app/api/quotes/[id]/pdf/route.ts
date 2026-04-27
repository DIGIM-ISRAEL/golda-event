import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { renderToBuffer, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { createElement } from 'react'
import { formatNIS } from '@/lib/pricing'
import { formatDate, formatTime } from '@/lib/utils'
import { EVENT_TYPE_LABELS } from '@/lib/constants'

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11 },
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  logo: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
  title: { fontSize: 18, fontWeight: 'bold', marginBottom: 20, color: '#0f172a' },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 12, fontWeight: 'bold', marginBottom: 8, color: '#374151',
    borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 4,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  label: { color: '#6b7280' },
  flavorChip: {
    backgroundColor: '#eff6ff', color: '#1d4ed8',
    padding: '3 8', borderRadius: 4, margin: 2, fontSize: 10,
  },
  flavorsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#e5e7eb',
  },
  totalLabel: { fontSize: 13, fontWeight: 'bold' },
  totalValue: { fontSize: 13, fontWeight: 'bold', color: '#2563eb' },
  terms: { marginTop: 24, fontSize: 9, color: '#9ca3af' },
  signatureBox: { marginTop: 40, borderTopWidth: 1, borderTopColor: '#d1d5db', paddingTop: 16 },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: '#000', marginBottom: 4, height: 30, width: '60%' },
})

const e = createElement

function row(label: string, value: string) {
  return e(View, { style: styles.row },
    e(Text, { style: styles.label }, label),
    e(Text, { style: { fontWeight: 'bold' } }, value),
  )
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
    include: {
      location: true,
      quote: true,
      flavors: { include: { flavor: true } },
    },
  })

  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const flavors = lead.flavors.map((lf) => lf.flavor)

  const doc = e(Document, null,
    e(Page, { size: 'A4', style: styles.page },
      e(View, { style: styles.header },
        e(Text, { style: styles.logo }, 'גולדה אירועים'),
        e(Text, { style: { fontSize: 10, color: '#6b7280' } }, `תאריך: ${new Date().toLocaleDateString('he-IL')}`),
      ),
      e(Text, { style: styles.title }, `הצעת מחיר — ${lead.clientName}`),
      e(View, { style: styles.section },
        e(Text, { style: styles.sectionTitle }, 'פרטי האירוע'),
        row('לקוח', lead.clientName),
        row('טלפון', lead.clientPhone),
        row('תאריך', formatDate(lead.eventDate)),
        row('שעות', `${formatTime(lead.startTime)} – ${formatTime(lead.endTime)}`),
        row('מיקום', lead.location?.cityName ?? '—'),
        row('משתתפים', `${lead.participants} נפש`),
        row('סוג אירוע', EVENT_TYPE_LABELS[lead.eventType]),
      ),
      e(View, { style: styles.section },
        e(Text, { style: styles.sectionTitle }, 'ההצעה כוללת'),
        e(Text, { style: { fontSize: 10, color: '#374151', lineHeight: 1.6 } },
          '✓ עגלת גלידה מקצועית\n✓ 6 טעמים לבחירתכם\n✓ 2 רטבים ו-3 תוספות\n✓ 2 שעות פעילות\n✓ 2 עובדים\n✓ ציוד הגשה בסיסי',
        ),
      ),
      flavors.length > 0
        ? e(View, { style: styles.section },
            e(Text, { style: styles.sectionTitle }, 'טעמים שנבחרו'),
            e(View, { style: styles.flavorsRow },
              ...flavors.map((f, i) => e(Text, { key: i, style: styles.flavorChip }, f.name)),
            ),
          )
        : null,
      lead.quote
        ? e(View, { style: styles.section },
            e(Text, { style: styles.sectionTitle }, 'תמחור'),
            lead.clientType === 'institutional' && lead.quote.vatAmount != null
              ? e(View, null,
                  row('מחיר לפני מע"מ', formatNIS(lead.quote.totalPrice - lead.quote.vatAmount)),
                  row('מע"מ (18%)', formatNIS(lead.quote.vatAmount)),
                )
              : null,
            e(View, { style: styles.totalRow },
              e(Text, { style: styles.totalLabel }, 'סה"כ לתשלום'),
              e(Text, { style: styles.totalValue }, formatNIS(lead.quote.totalPrice)),
            ),
            lead.quote.advancePaid > 0
              ? e(View, null,
                  row('מקדמה ששולמה', formatNIS(lead.quote.advancePaid)),
                  row('יתרה לתשלום', formatNIS(lead.quote.balanceDue)),
                )
              : null,
          )
        : null,
      e(Text, { style: styles.terms },
        '* ההצעה בתוקף ל-14 יום. ביטול עד 72 שעות לפני האירוע — ללא חיוב. ביטול פחות מ-72 שעות — חיוב 50%.',
      ),
      e(View, { style: styles.signatureBox },
        e(Text, { style: { fontWeight: 'bold', marginBottom: 16 } }, 'אישור והסכמה'),
        e(Text, { style: { fontSize: 10, marginBottom: 20 } },
          'אני הח"מ מאשר/ת את ההצעה לעיל ומסכים/ת לתנאים המפורטים.',
        ),
        e(View, { style: { flexDirection: 'row', justifyContent: 'space-between' } },
          e(View, null,
            e(View, { style: styles.signatureLine }),
            e(Text, { style: { fontSize: 9, color: '#6b7280' } }, 'חתימת הלקוח'),
          ),
          e(View, null,
            e(View, { style: styles.signatureLine }),
            e(Text, { style: { fontSize: 9, color: '#6b7280' } }, 'תאריך'),
          ),
        ),
      ),
    ),
  )

  const pdfBuffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0])

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quote-${lead.clientName}.pdf"`,
    },
  })
}
