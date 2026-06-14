// קטלוג הטעמים הרשמי — מקור האמת: לשונית "חישוב עלויות" בקובץ
// "פוטנציאל - גולדה תוכנית עסקית ועלויות" (עודכן 13/06/2026).
// הסדר כאן קובע את סדר התצוגה (sortOrder) במערכת.
// costPerBasketa = עלות ייצור לבסקטה (עמודת "עלות ייצור" באקסל, חומרי גלם + תקורת ייצור).
// שים לב: בטעמים שבאקסל חסר מחיר לחלק מהרכיבים — העלות מוטה כלפי מטה.

export interface CatalogFlavor {
  name: string
  category: 'dairy' | 'parve'
  costPerBasketa: number
}

// שינויי שם — טעמים קיימים שמקבלים שם חדש (שומר על היסטוריית האירועים שלהם)
export const FLAVOR_RENAMES: Record<string, string> = {
  'עוגת סנת אונורה': 'עוגת סנת אנורה',
  "אוכמניות וליצ'י": 'אוכמניות וליצי',
}

export const FLAVOR_CATALOG: CatalogFlavor[] = [
  { name: 'מנגו עוגת גבינה', category: 'dairy', costPerBasketa: 87.4 },
  { name: 'שוקולד מריר ופטל', category: 'dairy', costPerBasketa: 62.0 },
  { name: 'אוכמניות כחולות עם שוקולד לבן', category: 'dairy', costPerBasketa: 74.0 },
  { name: 'עוגת סנת אנורה', category: 'dairy', costPerBasketa: 103.9 },
  { name: 'אפוגטו', category: 'dairy', costPerBasketa: 112.6 },
  { name: 'טרמיסו', category: 'dairy', costPerBasketa: 98.3 },
  { name: 'עוגת יום הולדת', category: 'dairy', costPerBasketa: 111.6 },
  { name: 'בייגלה קרמל מלוח', category: 'dairy', costPerBasketa: 129.1 },
  { name: 'וניל', category: 'dairy', costPerBasketa: 113.9 },
  { name: 'שוקולד', category: 'dairy', costPerBasketa: 104.0 },
  { name: 'פיסטוק', category: 'dairy', costPerBasketa: 177.8 },
  { name: 'שוקולד פיסטוק', category: 'dairy', costPerBasketa: 160.8 },
  { name: 'שוקלד לבן קרם פיסטוק', category: 'dairy', costPerBasketa: 122.6 },
  { name: 'חלבה פיסטוק', category: 'dairy', costPerBasketa: 117.5 },
  { name: 'בייגלה שוקולד חלב', category: 'dairy', costPerBasketa: 137.8 },
  { name: 'בייגלה שוקולד לבן', category: 'dairy', costPerBasketa: 136.0 },
  { name: 'סמורס', category: 'dairy', costPerBasketa: 110.2 },
  { name: 'שוקולד לבן ועוגיות', category: 'dairy', costPerBasketa: 126.2 },
  { name: 'קוקיז', category: 'dairy', costPerBasketa: 103.5 },
  { name: 'קרם עוגיות', category: 'dairy', costPerBasketa: 126.2 },
  { name: 'מרשמלו', category: 'dairy', costPerBasketa: 96.0 },
  { name: 'מסטיק', category: 'dairy', costPerBasketa: 143.7 },
  { name: 'היער השחור', category: 'dairy', costPerBasketa: 98.3 },
  { name: 'תותים בטעם מסקרפונה ריקוטה', category: 'dairy', costPerBasketa: 92.0 },
  { name: 'מקדמיה', category: 'dairy', costPerBasketa: 92.0 },
  { name: 'עוגת ביסקוויטים', category: 'dairy', costPerBasketa: 92.0 },
  { name: 'עוגיות קרמל בטעם עוגת גבינה', category: 'dairy', costPerBasketa: 121.3 },
  { name: 'פבלובה', category: 'dairy', costPerBasketa: 99.4 },
  { name: 'בננה וקרם עוגיות קרמל', category: 'dairy', costPerBasketa: 111.3 },
  { name: 'בננה ספליט', category: 'dairy', costPerBasketa: 97.8 },
  { name: 'בננה טופי', category: 'dairy', costPerBasketa: 109.5 },
  { name: 'מנטה', category: 'dairy', costPerBasketa: 92.0 },
  { name: 'קוקימן', category: 'dairy', costPerBasketa: 94.3 },
  { name: 'שוקלד קפה', category: 'dairy', costPerBasketa: 111.7 },
  { name: 'וופל נוגט', category: 'dairy', costPerBasketa: 122.0 },
  { name: 'קרם שוקלד ואגוזי לוז', category: 'dairy', costPerBasketa: 141.4 },
  { name: 'מוס אגוזי לוז', category: 'dairy', costPerBasketa: 138.4 },
  { name: 'אגוזי לוז שלמים ושוקולד', category: 'dairy', costPerBasketa: 86.3 },
  { name: 'אגוזי לוז שלמים ושוקולד לבן', category: 'dairy', costPerBasketa: 86.3 },
  { name: 'פאי פקאן', category: 'dairy', costPerBasketa: 92.0 },
  { name: 'קרמשניט', category: 'dairy', costPerBasketa: 118.9 },
  { name: 'קרמל מלוח', category: 'dairy', costPerBasketa: 104.2 },
  { name: 'קשיו מלוח', category: 'dairy', costPerBasketa: 109.2 },
  { name: 'שוקולד מלוח', category: 'dairy', costPerBasketa: 112.1 },
  { name: 'שוקולד לבן קוקוס ושקדים', category: 'dairy', costPerBasketa: 98.9 },
  { name: 'שוקולד שקדים וקרמל', category: 'dairy', costPerBasketa: 107.4 },
  { name: 'בלונדי שקדים', category: 'dairy', costPerBasketa: 100.0 },
  { name: 'חמאת בוטנים ושוקולד מריר', category: 'dairy', costPerBasketa: 94.2 },
  { name: 'קפה ושוקולד', category: 'dairy', costPerBasketa: 92.0 },
  { name: "סטרצ'טלה", category: 'dairy', costPerBasketa: 92.0 },
  { name: 'עוגת גבינה קרמבל חמאה', category: 'dairy', costPerBasketa: 101.7 },
  { name: 'קרם ברולה קרמבל פיסטוק', category: 'dairy', costPerBasketa: 105.7 },
  { name: 'קרמבל פטל ושוקולד לבן', category: 'dairy', costPerBasketa: 103.5 },
  { name: 'פאי לימון', category: 'dairy', costPerBasketa: 103.5 },
  { name: 'קדאיף שוקולד פיסטוק', category: 'dairy', costPerBasketa: 125.3 },
  { name: 'קרם גלולית חומה', category: 'dairy', costPerBasketa: 107.0 },
  { name: 'קרם גלולית לבנה', category: 'dairy', costPerBasketa: 122.1 },
  { name: 'קפה לייט', category: 'dairy', costPerBasketa: 104.0 },
  { name: 'וניל לייט', category: 'dairy', costPerBasketa: 104.0 },
  { name: 'קוקוס', category: 'parve', costPerBasketa: 67.5 },
  { name: 'בננה תמר', category: 'parve', costPerBasketa: 69.7 },
  { name: 'לימונצלו', category: 'parve', costPerBasketa: 79.2 },
  { name: 'אבטיח נענע', category: 'parve', costPerBasketa: 67.5 },
  { name: 'בננה תות', category: 'parve', costPerBasketa: 72.6 },
  { name: 'תות', category: 'parve', costPerBasketa: 80.5 },
  { name: 'פירות יער', category: 'parve', costPerBasketa: 84.5 },
  { name: 'אוכמניות וליצי', category: 'parve', costPerBasketa: 95.0 },
  { name: 'אננס', category: 'parve', costPerBasketa: 85.5 },
  { name: 'מנגו', category: 'parve', costPerBasketa: 77.4 },
  { name: 'טרופי', category: 'parve', costPerBasketa: 82.3 },
  { name: 'שוקולד מריר', category: 'parve', costPerBasketa: 185.0 },
  { name: 'בייגלה מריר', category: 'parve', costPerBasketa: 192.3 },
  { name: 'מוס קרם עוגיות טבעוני', category: 'parve', costPerBasketa: 79.6 },
  { name: 'מוס קרם עוגיות קרמל טבעוני', category: 'parve', costPerBasketa: 80.5 },
]
