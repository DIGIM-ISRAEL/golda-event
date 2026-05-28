import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { renderToBuffer, Document, Page, Text, View, StyleSheet, Font, Svg, Path, Circle } from '@react-pdf/renderer'
import { createElement } from 'react'
import { formatNIS } from '@/lib/pricing'
import { formatDate, formatTime } from '@/lib/utils'
import { EVENT_TYPE_LABELS, DEFAULT_INCLUDED_ITEMS } from '@/lib/constants'
import { BRAND, BRAND_STRIPES, BRAND_TAGLINE } from '@/lib/brand'

// רישום גופנים עבריים (סטטיים) — מתקן את באג העברית ב-react-pdf
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')
Font.register({
  family: 'DavidLibre',
  fonts: [
    { src: path.join(FONT_DIR, 'DavidLibre-Regular.ttf') },
    { src: path.join(FONT_DIR, 'DavidLibre-Bold.ttf'), fontWeight: 'bold' },
  ],
})
Font.register({
  family: 'Alef',
  fonts: [
    { src: path.join(FONT_DIR, 'Alef-Regular.ttf') },
    { src: path.join(FONT_DIR, 'Alef-Bold.ttf'), fontWeight: 'bold' },
  ],
})
// בלי חיתוך מילים (חשוב לעברית)
Font.registerHyphenationCallback((word) => [word])

const styles = StyleSheet.create({
  page: { fontFamily: 'Alef', fontSize: 10, color: BRAND.ink, direction: 'rtl' },

  // כותרת ממותגת
  headerBand: { backgroundColor: BRAND.mint, paddingVertical: 26, alignItems: 'center' },
  logo: { fontFamily: 'DavidLibre', fontWeight: 'bold', fontSize: 38, color: BRAND.gold, letterSpacing: 6 },
  tagline: { fontFamily: 'Alef', fontSize: 7, color: BRAND.gold, letterSpacing: 3, marginTop: 4 },

  stripes: { flexDirection: 'row', height: 7 },

  content: { paddingHorizontal: 40, paddingTop: 24, paddingBottom: 40 },

  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 20 },
  title: { fontFamily: 'DavidLibre', fontWeight: 'bold', fontSize: 20, color: BRAND.maroon },
  dateText: { fontFamily: 'Alef', fontSize: 9, color: BRAND.gray },

  section: { marginBottom: 18 },
  sectionTitle: {
    fontFamily: 'DavidLibre', fontWeight: 'bold', fontSize: 12, color: BRAND.gold,
    marginBottom: 8, textAlign: 'right',
  },

  row: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  label: { color: BRAND.gray, fontSize: 10 },
  value: { color: BRAND.ink, fontSize: 10, fontWeight: 'bold' },

  includeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  includeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: BRAND.gold, marginLeft: 8 },
  includeText: { fontSize: 10, color: BRAND.ink },

  flavorsRow: { flexDirection: 'row', flexWrap: 'wrap' },
  flavorChip: {
    backgroundColor: BRAND.mint, color: BRAND.maroon,
    paddingVertical: 3, paddingHorizontal: 9, borderRadius: 10, margin: 2, fontSize: 9,
  },

  priceBox: { backgroundColor: BRAND.cream, borderRadius: 8, padding: 14 },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: BRAND.tan,
  },
  totalLabel: { fontFamily: 'DavidLibre', fontWeight: 'bold', fontSize: 13, color: BRAND.maroon },
  totalValue: { fontFamily: 'DavidLibre', fontWeight: 'bold', fontSize: 15, color: BRAND.gold },

  terms: { marginTop: 18, fontSize: 8, color: BRAND.gray, textAlign: 'right', lineHeight: 1.5 },

  signatureBox: { marginTop: 26, borderTopWidth: 1, borderTopColor: BRAND.tan, paddingTop: 16 },
  signatureTitle: { fontFamily: 'DavidLibre', fontWeight: 'bold', fontSize: 12, color: BRAND.maroon, marginBottom: 6, textAlign: 'right' },
  signatureLine: { borderBottomWidth: 1, borderBottomColor: BRAND.ink, height: 28, marginBottom: 4 },
  signatureCaption: { fontSize: 8, color: BRAND.gray, textAlign: 'right' },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0 },
  footerText: { textAlign: 'center', fontSize: 7, color: BRAND.gray, paddingVertical: 6, letterSpacing: 1 },
})

const e = createElement

// סמל הדקל של גולדה (זהב) ל-react-pdf
function palmSvg() {
  return e(Svg, { width: 38, height: 38, viewBox: '0 0 64 64', style: { marginBottom: 6 } },
    e(Path, { d: 'M32 30 C 31 40, 30 48, 28 58', stroke: BRAND.gold, strokeWidth: 2.4, fill: 'none' }),
    e(Path, { d: 'M32 30 C 33 40, 34 48, 36 58', stroke: BRAND.gold, strokeWidth: 2.4, fill: 'none' }),
    e(Path, { d: 'M32 30 C 24 24, 14 22, 5 24', stroke: BRAND.gold, strokeWidth: 2, fill: 'none' }),
    e(Path, { d: 'M32 30 C 26 21, 18 14, 9 12', stroke: BRAND.gold, strokeWidth: 2, fill: 'none' }),
    e(Path, { d: 'M32 30 C 31 19, 30 11, 30 4', stroke: BRAND.gold, strokeWidth: 2, fill: 'none' }),
    e(Path, { d: 'M32 30 C 33 19, 34 11, 34 4', stroke: BRAND.gold, strokeWidth: 2, fill: 'none' }),
    e(Path, { d: 'M32 30 C 38 21, 46 14, 55 12', stroke: BRAND.gold, strokeWidth: 2, fill: 'none' }),
    e(Path, { d: 'M32 30 C 40 24, 50 22, 59 24', stroke: BRAND.gold, strokeWidth: 2, fill: 'none' }),
    e(Circle, { cx: 32, cy: 29, r: 1.6, fill: BRAND.gold }),
    e(Circle, { cx: 28, cy: 30.5, r: 1.3, fill: BRAND.gold }),
    e(Circle, { cx: 36, cy: 30.5, r: 1.3, fill: BRAND.gold }),
  )
}

function stripeBar() {
  return e(View, { style: styles.stripes },
    ...BRAND_STRIPES.map((c, i) =>
      e(View, { key: i, style: { flex: 1, backgroundColor: c } }),
    ),
  )
}

function infoRow(label: string, value: string) {
  return e(View, { style: styles.row },
    e(Text, { style: styles.label }, label),
    e(Text, { style: styles.value }, value),
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
    include: { location: true, quote: true, flavors: { include: { flavor: true } } },
  })

  if (!lead) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const flavors = lead.flavors.map((lf) => lf.flavor)
  const includes = lead.includedItems.length > 0 ? lead.includedItems : DEFAULT_INCLUDED_ITEMS

  const doc = e(Document, null,
    e(Page, { size: 'A4', style: styles.page },

      // כותרת ממותגת
      e(View, { style: styles.headerBand },
        palmSvg(),
        e(Text, { style: styles.logo }, 'GOLDA'),
        e(Text, { style: styles.tagline }, BRAND_TAGLINE),
      ),
      stripeBar(),

      // תוכן
      e(View, { style: styles.content },
        e(View, { style: styles.titleRow },
          e(Text, { style: styles.title }, `הצעת מחיר`),
          e(Text, { style: styles.dateText }, new Date().toLocaleDateString('he-IL')),
        ),

        // פרטי האירוע
        e(View, { style: styles.section },
          e(Text, { style: styles.sectionTitle }, 'פרטי האירוע'),
          infoRow('שם הלקוח', lead.clientName),
          infoRow('טלפון', lead.clientPhone),
          infoRow('תאריך', formatDate(lead.eventDate)),
          infoRow('שעות', `${formatTime(lead.startTime)} – ${formatTime(lead.endTime)}`),
          infoRow('מיקום', lead.location?.cityName ?? '—'),
          infoRow('מספר משתתפים', `${lead.participants}`),
          infoRow('סוג אירוע', EVENT_TYPE_LABELS[lead.eventType]),
        ),

        // מה ההצעה כוללת
        e(View, { style: styles.section },
          e(Text, { style: styles.sectionTitle }, 'מה ההצעה כוללת'),
          ...includes.map((item, i) =>
            e(View, { key: i, style: styles.includeRow },
              e(View, { style: styles.includeDot }),
              e(Text, { style: styles.includeText }, item),
            ),
          ),
        ),

        // טעמים
        flavors.length > 0
          ? e(View, { style: styles.section },
              e(Text, { style: styles.sectionTitle }, `הטעמים שנבחרו (${flavors.length})`),
              e(View, { style: styles.flavorsRow },
                ...flavors.map((f, i) => e(Text, { key: i, style: styles.flavorChip }, f.name)),
              ),
            )
          : null,

        // תמחור
        lead.quote
          ? e(View, { style: styles.section },
              e(Text, { style: styles.sectionTitle }, 'תמחור'),
              e(View, { style: styles.priceBox },
                lead.clientType === 'institutional' && lead.quote.vatAmount != null
                  ? e(View, null,
                      infoRow('מחיר לפני מע"מ', formatNIS(lead.quote.totalPrice - lead.quote.vatAmount)),
                      infoRow('מע"מ (18%)', formatNIS(lead.quote.vatAmount)),
                    )
                  : null,
                e(View, { style: styles.totalRow },
                  e(Text, { style: styles.totalLabel }, 'סה"כ לתשלום'),
                  e(Text, { style: styles.totalValue }, formatNIS(lead.quote.totalPrice)),
                ),
                lead.quote.advancePaid > 0
                  ? e(View, { style: { marginTop: 8 } },
                      infoRow('מקדמה ששולמה', formatNIS(lead.quote.advancePaid)),
                      infoRow('יתרה לתשלום', formatNIS(lead.quote.balanceDue)),
                    )
                  : null,
              ),
            )
          : null,

        // תנאים
        e(Text, { style: styles.terms },
          'ההצעה בתוקף ל-14 יום ממועד הוצאתה. ביטול עד 72 שעות לפני האירוע — ללא חיוב. ביטול בפחות מ-72 שעות — חיוב 50% מערך ההזמנה.',
        ),

        // חתימה
        e(View, { style: styles.signatureBox },
          e(Text, { style: styles.signatureTitle }, 'אישור והסכמה'),
          e(Text, { style: { fontSize: 9, marginBottom: 18, textAlign: 'right', color: BRAND.ink } },
            'אני הח"מ מאשר/ת את ההצעה לעיל ומסכים/ה לתנאים המפורטים בה.',
          ),
          e(View, { style: { flexDirection: 'row', justifyContent: 'space-between', gap: 30 } },
            e(View, { style: { flex: 1 } },
              e(View, { style: styles.signatureLine }),
              e(Text, { style: styles.signatureCaption }, 'חתימת הלקוח'),
            ),
            e(View, { style: { flex: 1 } },
              e(View, { style: styles.signatureLine }),
              e(Text, { style: styles.signatureCaption }, 'תאריך'),
            ),
          ),
        ),
      ),

      // פוטר
      e(View, { style: styles.footer },
        e(Text, { style: styles.footerText }, 'גולדה אירועים  ·  ' + BRAND_TAGLINE),
        stripeBar(),
      ),
    ),
  )

  const pdfBuffer = await renderToBuffer(doc as Parameters<typeof renderToBuffer>[0])

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="golda-quote-${lead.id}.pdf"`,
    },
  })
}
