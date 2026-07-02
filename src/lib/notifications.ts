import { sendEmail } from '@/lib/email'
import { formatNIS } from '@/lib/pricing'
import { formatDate, toWhatsAppNumber } from '@/lib/utils'
import { getAppUrl } from '@/lib/app-url'

// התראת "הלקוח פתח את ההצעה" — הרגע הכי חם במכירה.
// 42.5% מהעסקאות שנסגרות — נסגרות תוך 24 שעות מהפתיחה הראשונה (Proposify 2024).
export async function notifyQuoteViewed(params: {
  leadId: string
  clientName: string
  clientPhone: string
  eventDate: string
  totalPrice: number | null
  salesRepEmail?: string | null
}): Promise<void> {
  const recipients = new Set<string>()
  if (process.env.ADMIN_EMAIL) recipients.add(process.env.ADMIN_EMAIL)
  if (params.salesRepEmail) recipients.add(params.salesRepEmail)
  if (recipients.size === 0) return

  const appUrl = getAppUrl()
  const waLink = `https://wa.me/${toWhatsAppNumber(params.clientPhone)}`

  await sendEmail({
    to: Array.from(recipients),
    subject: `👀 ${params.clientName} פתח/ה עכשיו את הצעת המחיר!`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;text-align:right;">
        <h2 style="margin:0 0 8px;">הלקוח צופה בהצעה ברגעים אלה 🔥</h2>
        <p style="color:#555;margin:0 0 16px;">רוב העסקאות נסגרות ביממה שאחרי הפתיחה — זה הזמן המושלם להתקשר.</p>
        <p><strong>לקוח:</strong> ${params.clientName}</p>
        <p><strong>טלפון:</strong> <a href="tel:${params.clientPhone}">${params.clientPhone}</a></p>
        <p><strong>תאריך אירוע:</strong> ${formatDate(params.eventDate)}</p>
        ${params.totalPrice != null ? `<p><strong>סכום ההצעה:</strong> ${formatNIS(params.totalPrice)}</p>` : ''}
        <div style="margin-top:16px;">
          <a href="tel:${params.clientPhone}"
             style="display:inline-block;background:#5E2A33;color:#FAF4E9;padding:10px 20px;border-radius:8px;text-decoration:none;margin-left:8px;">
            📞 התקשר עכשיו
          </a>
          <a href="${waLink}"
             style="display:inline-block;background:#4F7A43;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;margin-left:8px;">
            וואטסאפ
          </a>
          <a href="${appUrl}/leads/${params.leadId}"
             style="display:inline-block;background:#fff;color:#5E2A33;border:1px solid #5E2A33;padding:10px 20px;border-radius:8px;text-decoration:none;">
            פתח את הליד
          </a>
        </div>
      </div>
    `,
  })
}
