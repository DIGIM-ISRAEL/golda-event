// תבנית רשימת הציוד לאירוע — מקובצת לפי מדורים.
// ניתנת לעריכה בהגדרות (settings key: checklist_template); זו ברירת המחדל.
// הסימון של כל פריט נשמר לפי הטקסט שלו (ב-lead.checkedItems).

export interface ChecklistSection {
  title: string
  items: string[]
}

export const DEFAULT_CHECKLIST_TEMPLATE: ChecklistSection[] = [
  { title: 'לוגיסטיקה ורכב', items: ['רכב עם נגרר', 'לוודא איפה הנגרר'] },
  { title: 'ציוד קירור', items: ['צידניות שחורות', 'מקפיא נייד', 'עגלת גלידה'] },
  {
    title: 'כלי הגשה (זהב)',
    items: [
      'כפיות טעימה + 2 כלים לכפיות זהב',
      'פח כפיות + כלי זהב',
      'כוסות',
      'גביעים + קונוסים + מתקני גביעים זהב',
      'דיסקיות + כלי דיסקיות',
      'קערות וכפות זהב לרטבים ותוספות',
      'סוכריות + קערה זהב וכפית זהב',
      'מפיות + כלי מפיות',
      '7 ספצולות',
    ],
  },
  {
    title: 'ניקיון',
    items: ['מגבונים — אלכוהול + רגיל', 'נייר + ספריי חלונות (כחול)', 'כפפות L'],
  },
  { title: 'שילוט', items: ['שלטים (משתנים לפי הטעמים)'] },
]

// קריאת התבנית מההגדרות (JSON) עם נפילה רכה לברירת המחדל.
export function parseChecklistTemplate(raw: string | undefined | null): ChecklistSection[] {
  if (!raw) return DEFAULT_CHECKLIST_TEMPLATE
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      const clean = parsed
        .filter((s): s is ChecklistSection => s && typeof s.title === 'string' && Array.isArray(s.items))
        .map((s) => ({
          title: s.title.trim(),
          items: s.items.map((i) => String(i).trim()).filter(Boolean),
        }))
        .filter((s) => s.title && s.items.length > 0)
      if (clean.length > 0) return clean
    }
  } catch {
    /* JSON פגום — ברירת מחדל */
  }
  return DEFAULT_CHECKLIST_TEMPLATE
}

// כל פריטי התבנית כרשימה שטוחה (לספירת התקדמות וכו')
export function allTemplateItems(sections: ChecklistSection[]): string[] {
  return sections.flatMap((s) => s.items)
}
