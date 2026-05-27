// רשימת ההכנה לאירוע — פריטים קבועים שצריך להוציא/לארגן
// מס׳ הבסקטות מחושב דינמית לפי מס׳ המשתתפים

export interface ChecklistItem {
  id: string
  label: string
  category: 'logistics' | 'equipment' | 'serving' | 'extra'
}

export const CHECKLIST_ITEMS: ChecklistItem[] = [
  // לוגיסטיקה
  { id: 'vehicle_trailer', label: 'רכב עם נגרר', category: 'logistics' },
  { id: 'trailer_location', label: 'לוודא איפה הנגרר', category: 'logistics' },

  // ציוד קירור
  { id: 'cooler_boxes', label: 'צידניות שחורות', category: 'equipment' },
  { id: 'freezer', label: 'מקפיא נייד', category: 'equipment' },
  { id: 'ice_cream_cart', label: 'עגלת גלידה', category: 'equipment' },

  // הגשה
  { id: 'spoons', label: 'כפיות חד-פעמיות', category: 'serving' },
  { id: 'cups', label: 'כוסות / קעריות', category: 'serving' },
  { id: 'napkins', label: 'מפיות', category: 'serving' },
  { id: 'scoops', label: 'מצקות הגשה', category: 'serving' },
  { id: 'flavor_signs', label: 'שלטי טעמים', category: 'serving' },

  // נוסף
  { id: 'cleaning', label: 'חומרי ניקוי', category: 'extra' },
]

export const CATEGORY_LABELS: Record<ChecklistItem['category'], string> = {
  logistics: 'לוגיסטיקה ורכב',
  equipment: 'ציוד קירור',
  serving: 'ציוד הגשה',
  extra: 'נוסף',
}

export function getItemById(id: string): ChecklistItem | undefined {
  return CHECKLIST_ITEMS.find((item) => item.id === id)
}

export function groupedItems(): Record<string, ChecklistItem[]> {
  const groups: Record<string, ChecklistItem[]> = {}
  for (const item of CHECKLIST_ITEMS) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }
  return groups
}
