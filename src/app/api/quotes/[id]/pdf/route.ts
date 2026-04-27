import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
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
  const flavors: { name: string }[] = lead.flavors?.map((f: { flavor: { name: string } }) => f.flavor) ?? []

  const doc = e(Document, null,
    e(Page, { size: 'A4', style: styles.page },
      // Header
      e(View, { style: styles.header },
        e(Text, { style: styles.logo }, 'גולדה אירועים'),
        e(Text, { style: { fontSize: 10, color: '#6b7280' } }, `תאריך: ${new Date().toLocaleDateString('he-IL')}`),
      ),

      e(Text, { style: styles.title }, `הצעת מחיר — ${lead.client_name}`),

      // Event details
      e(View, { style: styles.section },
        e(Text, { style: styles.sectionTitle }, 'פרטי האירוע'),
        row('לקוח', lead.client_name),
        row('טלפון', lead.client_phone),
        row('תאריך', formatDate(lead.event_date)),
        row('שעות', `${formatTime(lead.start_time)} – ${formatTime(lead.end_time)}`),
        row('מיקום', lead.location?.city_name ?? '—'),
        row('משתתפים', `${lead.participants} נפש`),
        row('סוג אירוע', EVENT_TYPE_LABELS[lead.event_type]),
      ),

      // What's included
      e(View, { style: styles.section },
        e(Text, { style: styles.sectionTitle }, 'ההצעה כוללת'),
        e(Text, { style: { fontSize: 10, color: '#374151', lineHeight: 1.6 } },
          '✓ עגלת גלידה מקצועית\n✓ 6 טעמים לבחירתכם\n✓ 2 רטבים ו-3 תוספות\n✓ 2 שעות פעילות\n✓ 2 עובדים\n✓ ציוד הגשה בסיסי',
        ),
      ),

      // Flavors
      flavors.length > 0
        ? e(View, { style: styles.section },
            e(Text, { style: styles.sectionTitle }, 'טעמים שנבחרו'),
            e(View, { style: styles.flavorsRow },
              ...flavors.map((f, i) => e(Text, { key: i, style: styles.flavorChip }, f.name)),
            ),
          )
        : null,

      // Pricing
      quote
        ? e(View, { style: styles.section },
            e(Text, { style: styles.sectionTitle }, 'תמחור'),
            lead.client_type === 'institutional' && quote.vat_amount != null
              ? e(View, null,
                  row('מחיר לפני מע"מ', formatNIS(quote.total_price - quote.vat_amount)),
                  row('מע"מ (18%)', formatNIS(quote.vat_amount)),
                )
              : null,
            e(View, { style: styles.totalRow },
              e(Text, { style: styles.totalLabel }, 'סה"כ לתשלום'),
              e(Text, { style: styles.totalValue }, formatNIS(quote.total_price)),
            ),
            quote.advance_paid > 0
              ? e(View, null,
                  row('מקדמה ששולמה', formatNIS(quote.advance_paid)),
                  row('יתרה לתשלום', formatNIS(quote.balance_due)),
                )
              : null,
          )
        : null,

      // Terms
      e(Text, { style: styles.terms },
        '* ההצעה בתוקף ל-14 יום. ביטול עד 72 שעות לפני האירוע — ללא חיוב. ביטול פחות מ-72 שעות — חיוב 50%.',
      ),

      // Signature
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

  const pdfBuffer = await renderToBuffer(doc as any)

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="quote-${lead.client_name}.pdf"`,
    },
  })
}
