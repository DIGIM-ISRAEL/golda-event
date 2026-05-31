export const LEAD_STATUS_LABELS: Record<string, string> = {
  lead: 'ליד',
  quote_sent: 'הצעת מחיר נשלחה',
  closed: 'סגור / שמור',
  done: 'בוצע',
  canceled: 'בוטל',
}

// גווני סטטוס בשפת המותג — פסטלים חמים, עדינים וקריאים (לא צבעי ברירת־מחדל של Tailwind)
export const LEAD_STATUS_COLORS: Record<string, string> = {
  lead: 'bg-[#DCEAE3] text-[#4A6A5C]',        // מנטה — ליד טרי
  quote_sent: 'bg-[#F2EBD7] text-[#6F6440]',  // זהב חיוור — ממתין
  closed: 'bg-[#E2EEDD] text-[#436B36]',      // ירוק רך — נסגר/שמור
  done: 'bg-[#ECE5D8] text-[#8A7F72]',        // חול — בוצע/ארכיון
  canceled: 'bg-[#F2DED6] text-[#8A4A45]',    // אפרסק־ורוד — בוטל
}

// נקודת צבע אחידה לכל סטטוס (לשימוש במונים/מקראות)
export const LEAD_STATUS_DOTS: Record<string, string> = {
  lead: 'bg-[#8FB3A3]',
  quote_sent: 'bg-brand-gold',
  closed: 'bg-[#6B9A5B]',
  done: 'bg-brand-sand',
  canceled: 'bg-brand-peach',
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
