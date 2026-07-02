// כתובת הבסיס של האפליקציה — מקור אמת אחד לכל הלינקים שנשלחים החוצה
// (וואטסאפ, מיילים, לינקים ציבוריים). נופל ל-Railway ואז ל-localhost,
// כדי שעותק חדש בלי NEXT_PUBLIC_APP_URL לא ישלח לינקים שבורים בשקט.
export function getAppUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL
  if (explicit) return explicit.replace(/\/+$/, '')
  const railway = process.env.RAILWAY_PUBLIC_DOMAIN
  if (railway) return `https://${railway}`
  return 'http://localhost:3000'
}
