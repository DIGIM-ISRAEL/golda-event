export const LEAD_STATUS_LABELS: Record<string, string> = {
  lead: 'ליד',
  quote_sent: 'הצעת מחיר נשלחה',
  closed: 'סגור / שמור',
  done: 'בוצע',
  canceled: 'בוטל',
}

export const LEAD_STATUS_COLORS: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-800',
  quote_sent: 'bg-yellow-100 text-yellow-800',
  closed: 'bg-green-100 text-green-800',
  done: 'bg-gray-100 text-gray-800',
  canceled: 'bg-red-100 text-red-800',
}

export const CLIENT_TYPE_LABELS: Record<string, string> = {
  institutional: 'מוסדי / חברה',
  private: 'פרטי',
}

export const EVENT_TYPE_LABELS: Record<string, string> = {
  dairy: 'אירוע חלבי',
  parve: 'אירוע פרווה / בשרי',
}

export const INSTITUTIONAL_BASE_PRICE = 5800
export const INSTITUTIONAL_BASE_PARTICIPANTS = 150
export const INSTITUTIONAL_EXTRA_PER_PERSON = 15
export const PRIVATE_BASE_PER_PERSON = 38
export const VAT_RATE = 0.18

export const MANAGER_COST = 500
export const ASSISTANT_COST = 300

export const GRAMS_PER_PORTION = 120
export const GRAMS_PER_BASKETA = 4500

export const MAX_FLAVORS = 6

export const OPERATIONAL_WARNING =
  'שים לב: צידניות שחורות ואייס-פקס שומרים קירור עד שעתיים. חובה להפעיל מקפיא בשטח ולקזז חצי שעת קירור.'

// רשימת ברירת מחדל למה שההצעה כוללת — ניתנת לעריכה לכל ליד
export const DEFAULT_INCLUDED_ITEMS = [
  'עגלת גלידה מקצועית',
  '6 טעמים לבחירתכם',
  '2 רטבים ו-3 תוספות',
  '2 שעות פעילות',
  '2 עובדים',
  'ציוד הגשה',
]
