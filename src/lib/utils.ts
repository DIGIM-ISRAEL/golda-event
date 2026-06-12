export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(date: string | Date): string {
  const dateStr = typeof date === 'string' ? date : date.toISOString().slice(0, 10)
  const [year, month, day] = dateStr.split('-')
  return `${day}/${month}/${year}`
}

export function formatTime(timeStr: string): string {
  return timeStr.slice(0, 5)
}

// תאריך בשעון ישראל בפורמט YYYY-MM-DD.
// השרת (Railway) רץ ב-UTC — toISOString נותן יום שגוי בין חצות ל-02:00/03:00 שעון ישראל.
export function israelDateStr(offsetDays = 0): string {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jerusalem',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d)
}

// ממיר מספר טלפון ישראלי לפורמט בינלאומי ל-WhatsApp (972...)
export function toWhatsAppNumber(phone: string): string {
  let digits = phone.replace(/\D/g, '')
  if (digits.startsWith('0')) {
    digits = '972' + digits.slice(1)
  } else if (!digits.startsWith('972')) {
    digits = '972' + digits
  }
  return digits
}

export function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export function timesOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const s1 = timeToMinutes(start1)
  const e1 = timeToMinutes(end1)
  const s2 = timeToMinutes(start2)
  const e2 = timeToMinutes(end2)
  return s1 < e2 && e1 > s2
}
