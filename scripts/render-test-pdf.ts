// בדיקת רינדור PDF עם נתוני דמה — להרצה: npx tsx scripts/render-test-pdf.ts
import { writeFileSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import { renderQuotePdf } from '../src/lib/quote-pdf'

async function main() {
  const buf = await renderQuotePdf({
    clientName: 'חברת אלביט מערכות',
    clientPhone: '050-1234567',
    eventDateLabel: '15/07/2026',
    startTimeLabel: '18:00',
    endTimeLabel: '20:00',
    cityName: 'הרצליה',
    participants: 200,
    eventTypeLabel: 'אירוע חלבי',
    isInstitutional: true,
    todayLabel: new Date().toLocaleDateString('he-IL', { timeZone: 'Asia/Jerusalem' }),
    includedItems: [
      'עגלת גלידה מקצועית',
      '6 טעמים לבחירתכם',
      '2 רטבים ו-3 תוספות',
      '2 שעות פעילות',
      '2 עובדים',
      'ציוד הגשה',
    ],
    flavors: ['וניל', 'שוקולד', 'פיסטוק', 'קרמל מלוח', 'תות', 'מנגו עוגת גבינה'],
    pricing: {
      totalPrice: 8024,
      vatAmount: 1224,
      advancePaid: 2000,
      balanceDue: 6024,
    },
  })

  const outDir = path.join(process.cwd(), '.shots')
  mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, 'test-quote.pdf')
  writeFileSync(outPath, buf)
  console.log(`PDF written: ${outPath} (${(buf.length / 1024).toFixed(0)} KB)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
