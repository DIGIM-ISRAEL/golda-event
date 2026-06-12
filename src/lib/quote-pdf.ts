// בניית PDF של הצעת מחיר — מחולץ ל-lib כדי לשמש גם את ה-route וגם בדיקות רינדור.
import path from 'node:path'
import { readFileSync } from 'node:fs'
import {
  renderToBuffer,
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from '@react-pdf/renderer'
import { createElement as e } from 'react'
import { formatNIS } from '@/lib/pricing'
import { BRAND, BRAND_STRIPES, BRAND_TAGLINE } from '@/lib/brand'

// רישום גופנים עבריים (סטטיים) — מתקן את באג העברית ב-react-pdf
const FONT_DIR = path.join(process.cwd(), 'public', 'fonts')
const LOGO_PATH = path.join(process.cwd(), 'public', 'brand', 'tree-logo.png')

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

  // כותרת ממותגת — הלוגו הרשמי על רקע קרם
  headerBand: { backgroundColor: BRAND.cream, paddingVertical: 18, alignItems: 'center' },
  logoImg: { height: 86, objectFit: 'contain' },
  tagline: { fontFamily: 'Alef', fontSize: 7, color: BRAND.goldDeep, letterSpacing: 3, marginTop: 8 },

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

  // row-reverse — הנקודה מימין והטקסט נשפך ימינה-שמאלה (RTL)
  includeRow: { flexDirection: 'row-reverse', alignItems: 'center', marginBottom: 5 },
  includeDot: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: BRAND.gold, marginLeft: 8 },
  includeText: { fontSize: 10, color: BRAND.ink },

  flavorsRow: { flexDirection: 'row-reverse', flexWrap: 'wrap' },
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

export interface QuotePdfData {
  clientName: string
  clientPhone: string
  eventDateLabel: string // DD/MM/YYYY
  startTimeLabel: string // HH:MM
  endTimeLabel: string // HH:MM
  cityName: string | null
  participants: number
  eventTypeLabel: string
  isInstitutional: boolean
  todayLabel: string // תאריך הוצאת ההצעה
  includedItems: string[]
  flavors: string[]
  pricing: {
    totalPrice: number
    vatAmount: number | null
    advancePaid: number
    balanceDue: number
  } | null
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

export async function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  const doc = e(Document, null,
    e(Page, { size: 'A4', style: styles.page },

      // כותרת ממותגת — הלוגו הרשמי (Buffer — נתיב מקומי נכשל ב-fetch של react-pdf)
      e(View, { style: styles.headerBand },
        e(Image, { src: readFileSync(LOGO_PATH), style: styles.logoImg }),
        e(Text, { style: styles.tagline }, BRAND_TAGLINE),
      ),
      stripeBar(),

      // תוכן
      e(View, { style: styles.content },
        e(View, { style: styles.titleRow },
          e(Text, { style: styles.title }, `הצעת מחיר`),
          e(Text, { style: styles.dateText }, data.todayLabel),
        ),

        // פרטי האירוע
        e(View, { style: styles.section },
          e(Text, { style: styles.sectionTitle }, 'פרטי האירוע'),
          infoRow('שם הלקוח', data.clientName),
          infoRow('טלפון', data.clientPhone),
          infoRow('תאריך', data.eventDateLabel),
          infoRow('שעות', `${data.startTimeLabel} – ${data.endTimeLabel}`),
          infoRow('מיקום', data.cityName ?? '—'),
          infoRow('מספר משתתפים', `${data.participants}`),
          infoRow('סוג אירוע', data.eventTypeLabel),
        ),

        // מה ההצעה כוללת — תו RLM בתחילת כל שורה מתקן פריטים שמתחילים במספר ("6 טעמים")
        e(View, { style: styles.section },
          e(Text, { style: styles.sectionTitle }, 'מה ההצעה כוללת'),
          ...data.includedItems.map((item, i) =>
            e(View, { key: i, style: styles.includeRow },
              e(View, { style: styles.includeDot }),
              e(Text, { style: styles.includeText }, '‏' + item),
            ),
          ),
        ),

        // טעמים
        data.flavors.length > 0
          ? e(View, { style: styles.section },
              e(Text, { style: styles.sectionTitle }, `הטעמים שנבחרו (${data.flavors.length})`),
              e(View, { style: styles.flavorsRow },
                ...data.flavors.map((name, i) => e(Text, { key: i, style: styles.flavorChip }, name)),
              ),
            )
          : null,

        // תמחור
        data.pricing
          ? e(View, { style: styles.section },
              e(Text, { style: styles.sectionTitle }, 'תמחור'),
              e(View, { style: styles.priceBox },
                data.isInstitutional && data.pricing.vatAmount != null
                  ? e(View, null,
                      infoRow('מחיר לפני מע"מ', formatNIS(data.pricing.totalPrice - data.pricing.vatAmount)),
                      infoRow('מע"מ (18%)', formatNIS(data.pricing.vatAmount)),
                    )
                  : null,
                e(View, { style: styles.totalRow },
                  e(Text, { style: styles.totalLabel }, 'סה"כ לתשלום'),
                  e(Text, { style: styles.totalValue }, formatNIS(data.pricing.totalPrice)),
                ),
                data.pricing.advancePaid > 0
                  ? e(View, { style: { marginTop: 8 } },
                      infoRow('מקדמה ששולמה', formatNIS(data.pricing.advancePaid)),
                      infoRow('יתרה לתשלום', formatNIS(data.pricing.balanceDue)),
                    )
                  : null,
              ),
            )
          : null,

        // תנאים
        e(Text, { style: styles.terms },
          '‏ההצעה בתוקף ל-14 יום ממועד הוצאתה. ביטול עד 72 שעות לפני האירוע — ללא חיוב. ביטול בפחות מ-72 שעות — חיוב 50% מערך ההזמנה.',
        ),

        // חתימה
        e(View, { style: styles.signatureBox },
          e(Text, { style: styles.signatureTitle }, 'אישור והסכמה'),
          e(Text, { style: { fontSize: 9, marginBottom: 18, textAlign: 'right', color: BRAND.ink } },
            '‏אני הח"מ מאשר/ת את ההצעה לעיל ומסכים/ה לתנאים המפורטים בה.',
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

  return renderToBuffer(doc as Parameters<typeof renderToBuffer>[0])
}
