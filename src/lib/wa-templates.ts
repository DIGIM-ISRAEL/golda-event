// תבניות הודעה לוואטסאפ — מוכנות מראש, עם משתנים שמתמלאים אוטומטית מהליד.
// נשמרות בהגדרות (key: wa_templates) כ-JSON; אם ריק — משתמשים בברירות המחדל.

export interface WaTemplate {
  title: string // שם הכפתור
  body: string // גוף ההודעה, עם משתנים בסוגריים מסולסלים
}

// המשתנים הנתמכים בגוף ההודעה
export const WA_PLACEHOLDERS = ['{שם}', '{תאריך}', '{שעה}', '{מיקום}', '{מחיר}', '{קישור}'] as const

export const DEFAULT_WA_TEMPLATES: WaTemplate[] = [
  {
    title: 'ברכה ראשונה',
    body: 'שלום {שם}! 🍦\nתודה שפניתם לגולדה אירועים. נשמח להפוך את האירוע שלכם ב-{תאריך} לבלתי נשכח.\nאשמח לשמוע עוד פרטים כדי להכין לכם הצעה מדויקת.',
  },
  {
    title: 'שליחת הצעה',
    body: 'שלום {שם}! 🍦\nמצורפת הצעת המחיר לאירוע ב-{תאריך}{מיקום}.\n💰 סה"כ: {מחיר}\nלצפייה בהצעה המלאה ואישור דיגיטלי:\n{קישור}\nנשמח לעמוד לרשותכם בכל שאלה!',
  },
  {
    title: 'תזכורת / פולואפ',
    body: 'היי {שם}, רק רציתי לוודא שקיבלתם את הצעת המחיר לאירוע ב-{תאריך} 🍦\nאשמח לענות על כל שאלה ולעזור לכם לסגור את התאריך.\n{קישור}',
  },
  {
    title: 'תודה אחרי סגירה',
    body: 'תודה רבה {שם}! 🎉\nשמחנו לסגור את האירוע ב-{תאריך}. אנחנו כבר מתרגשים!\nניצור איתכם קשר לקראת המועד לתיאום הפרטים האחרונים. 🍦',
  },
  {
    title: 'תיאום יום לפני',
    body: 'היי {שם}! מתרגשים לקראת מחר 🍦\nרק מוודאים את הפרטים: {תאריך} בשעה {שעה}{מיקום}.\nנגיע כ-45 דקות לפני להקמה. נתראה!',
  },
]

export function parseWaTemplates(raw: string | undefined | null): WaTemplate[] {
  if (!raw) return DEFAULT_WA_TEMPLATES
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter(
        (t): t is WaTemplate => t && typeof t.title === 'string' && typeof t.body === 'string',
      )
    }
  } catch {
    // JSON פגום — נופלים לברירת המחדל
  }
  return DEFAULT_WA_TEMPLATES
}

export interface WaFillVars {
  name: string
  dateLabel: string
  timeLabel: string
  cityName: string | null
  priceLabel: string
  approveUrl: string
}

// ממלא את המשתנים בתבנית. {מיקום} מתרחב ל" בעיר" כדי שהמשפט יזרום, או ריק אם אין.
export function fillWaTemplate(body: string, v: WaFillVars): string {
  return body
    .replaceAll('{שם}', v.name)
    .replaceAll('{תאריך}', v.dateLabel)
    .replaceAll('{שעה}', v.timeLabel)
    .replaceAll('{מיקום}', v.cityName ? ` ב${v.cityName}` : '')
    .replaceAll('{מחיר}', v.priceLabel)
    .replaceAll('{קישור}', v.approveUrl)
}
