import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { parseChecklistTemplate, type ChecklistSection } from '@/lib/checklist'
import { calculateInventory } from '@/lib/inventory'
import { formatNIS } from '@/lib/pricing'
import { formatDate, formatTime, israelDateStr, toWhatsAppNumber } from '@/lib/utils'
import { getAppUrl } from '@/lib/app-url'

// Endpoint יורץ פעם ביום (Railway cron) ב-09:00. שתי עבודות:
//  1. תזכורת תפעולית לכל אירוע שמתקיים מחר
//  2. תזכורת פולואפ על הצעות שנשלחו ולא נחתמו (ביום ה-2 וביום ה-5)
//     — מחקרי הצעות מראים שתזכורות מעלות סגירה ב-10–30%, ורוב המוכרים פשוט שוכחים.
export async function GET(request: NextRequest) {
  // אימות secret
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // מחר בפורמט YYYY-MM-DD (שעון ישראל — השרת רץ ב-UTC)
  const tomorrowStr = israelDateStr(1)

  // מצא את כל האירועים של מחר שטרם נשלחה אליהם תזכורת
  const events = await db.lead.findMany({
    where: {
      eventDate: tomorrowStr,
      status: { in: ['closed', 'quote_sent'] },
      reminderSentAt: null,
    },
    include: {
      location: true,
      salesRep: true,
      flavors: { include: { flavor: true } },
      quote: true,
    },
  })

  // קבל הגדרות בשביל מחיר בסקטה
  const settingsRows = await db.settings.findMany().catch(() => [])
  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))
  const basketaCost = Number(settingsMap['basketa_cost_nis'] ?? 150)
  const checklistTemplate = parseChecklistTemplate(settingsMap['checklist_template'])

  const results: { leadId: string; sent: boolean; to: string }[] = []

  for (const event of events) {
    const flavors = event.flavors.map((lf) => lf.flavor)
    const inventory = calculateInventory(event.participants, basketaCost)

    // מקבלי התזכורת — איש המכירות + אדמין
    const recipients = new Set<string>()
    recipients.add(process.env.ADMIN_EMAIL ?? 'ron@digim.co.il')
    if (event.salesRep?.email) recipients.add(event.salesRep.email)

    const html = renderReminderHtml({
      clientName: event.clientName,
      clientPhone: event.clientPhone,
      eventDate: event.eventDate,
      startTime: event.startTime,
      endTime: event.endTime,
      cityName: event.location?.cityName ?? '—',
      participants: event.participants,
      basketasRequired: inventory.basketasRequired,
      flavors: flavors.map((f) => ({ name: f.name, category: f.category })),
      notes: event.notes,
      leadId: event.id,
      checklistTemplate,
    })

    const to = Array.from(recipients).join(', ')
    const sent = await sendEmail({
      to: Array.from(recipients),
      subject: `📅 תזכורת לאירוע מחר — ${event.clientName} · ${event.location?.cityName ?? ''}`,
      html,
    })

    if (sent) {
      await db.lead.update({
        where: { id: event.id },
        data: { reminderSentAt: new Date() },
      })
    }

    results.push({ leadId: event.id, sent, to })
  }

  // ── פולואפ הצעות תקועות ──────────────────────────────
  const followups = await sendQuoteFollowups()

  return NextResponse.json({
    ok: true,
    date: tomorrowStr,
    eventsFound: events.length,
    results,
    followups,
  })
}

// כושר ייצור גלידן: 9 בסקטות בשעה (מתוך אקסל העלויות, "36 קילו בשעה")
const BASKETAS_PER_HOUR = 9
const DAY_MS = 24 * 60 * 60 * 1000
// שלבי הפולואפ: יום 2 (נגיעה ראשונה) ויום 5 (נגיעה שנייה) — אחר כך מפסיקים
const FOLLOWUP_DAYS = [2, 5]

async function sendQuoteFollowups(): Promise<{ due: number; sent: boolean }> {
  const candidates = await db.lead.findMany({
    where: {
      status: 'quote_sent',
      clientApprovedAt: null,
      followupStage: { lt: FOLLOWUP_DAYS.length },
    },
    include: { location: true, quote: true, salesRep: true },
  })

  const now = Date.now()
  const due = candidates.filter((lead) => {
    const sentAt = (lead.quoteSentAt ?? lead.updatedAt).getTime()
    return now - sentAt >= FOLLOWUP_DAYS[lead.followupStage] * DAY_MS
  })

  if (due.length === 0) return { due: 0, sent: false }

  const appUrl = getAppUrl()
  const recipients = new Set<string>()
  if (process.env.ADMIN_EMAIL) recipients.add(process.env.ADMIN_EMAIL)
  for (const lead of due) {
    if (lead.salesRep?.email) recipients.add(lead.salesRep.email)
  }
  if (recipients.size === 0) return { due: due.length, sent: false }

  const rows = due
    .map((lead) => {
      const daysWaiting = Math.floor((now - (lead.quoteSentAt ?? lead.updatedAt).getTime()) / DAY_MS)
      const approveUrl = `${appUrl}/approve/${lead.signatureToken}`
      const nudge = [
        `היי ${lead.clientName}, רק מוודא שקיבלתם את הצעת המחיר לאירוע ב-${formatDate(lead.eventDate)} 🍦`,
        `אשמח לענות על כל שאלה.`,
        `לצפייה ואישור: ${approveUrl}`,
      ].join('\n')
      const waHref = `https://wa.me/${toWhatsAppNumber(lead.clientPhone)}?text=${encodeURIComponent(nudge)}`

      return `
        <tr>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;">
            <strong>${lead.clientName}</strong><br>
            <span style="color:#777;font-size:12px;">
              ${formatDate(lead.eventDate)} · ${lead.location?.cityName ?? '—'}
              ${lead.quote ? ` · ${formatNIS(lead.quote.totalPrice)}` : ''}
            </span>
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;font-size:13px;color:#555;">
            ממתינה ${daysWaiting} ימים${lead.quoteViewedAt ? ' · 👀 נצפתה' : ' · טרם נצפתה'}
          </td>
          <td style="padding:10px 8px;border-bottom:1px solid #eee;white-space:nowrap;">
            <a href="${waHref}" style="background:#4F7A43;color:#fff;padding:6px 12px;border-radius:6px;text-decoration:none;font-size:13px;">תזכורת בוואטסאפ</a>
            <a href="${appUrl}/leads/${lead.id}" style="color:#5E2A33;font-size:13px;margin-right:8px;">פתח ליד</a>
          </td>
        </tr>`
    })
    .join('')

  const sent = await sendEmail({
    to: Array.from(recipients),
    subject: `⏰ ${due.length} הצעות מחיר מחכות לפולואפ`,
    html: `
      <div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;text-align:right;">
        <h2 style="margin:0 0 6px;">הצעות שנשלחו וטרם נחתמו</h2>
        <p style="color:#666;margin:0 0 16px;font-size:14px;">
          לקוח שקיבל תזכורת אחת סוגר משמעותית יותר — לחיצה אחת על הכפתור הירוק שולחת הודעת תזכורת מנוסחת מראש.
        </p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
      </div>
    `,
  })

  if (sent) {
    await db.lead.updateMany({
      where: { id: { in: due.map((l) => l.id) } },
      data: { followupStage: { increment: 1 } },
    })
  }

  return { due: due.length, sent }
}

function renderReminderHtml(params: {
  clientName: string
  clientPhone: string
  eventDate: string
  startTime: string
  endTime: string
  cityName: string
  participants: number
  basketasRequired: number
  flavors: { name: string; category: string }[]
  notes: string | null
  leadId: string
  checklistTemplate: ChecklistSection[]
}) {
  const appUrl = getAppUrl()
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(params.cityName)}`

  const checklistHtml = params.checklistTemplate
    .map((section) => {
      const rows = section.items
        .map(
          (item) =>
            `<tr><td style="padding:4px 0;">☐</td><td style="padding:4px 8px;">${item}</td></tr>`,
        )
        .join('')
      return `
        <tr><td colspan="2" style="padding-top:12px;font-weight:bold;color:#555;font-size:13px;">${section.title}</td></tr>
        ${rows}
      `
    })
    .join('')

  const flavorsList = params.flavors
    .map(
      (f) =>
        `<span style="display:inline-block;padding:4px 10px;border-radius:12px;margin:2px;background:${f.category === 'dairy' ? '#dbeafe' : '#dcfce7'};font-size:13px;">${f.name}</span>`,
    )
    .join(' ')

  return `
<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
<meta charset="utf-8">
<title>תזכורת אירוע מחר</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;background:#f3f4f6;margin:0;padding:20px;direction:rtl;text-align:right;">
  <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.05);">
    <div style="background:#2563eb;color:white;padding:20px;">
      <h1 style="margin:0;font-size:20px;">📅 תזכורת — אירוע מחר</h1>
      <p style="margin:6px 0 0;opacity:0.9;font-size:14px;">${formatDate(params.eventDate)}</p>
    </div>

    <div style="padding:24px;">
      <h2 style="margin:0 0 12px;font-size:18px;color:#111827;">${params.clientName}</h2>

      <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
        <tr><td style="padding:4px 0;color:#6b7280;width:90px;">טלפון:</td><td><a href="tel:${params.clientPhone}" style="color:#2563eb;">${params.clientPhone}</a></td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">שעות:</td><td>${formatTime(params.startTime)} – ${formatTime(params.endTime)}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">מקום:</td><td>${params.cityName} · <a href="${wazeUrl}" style="color:#2563eb;">פתח בוויז 🗺️</a></td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">משתתפים:</td><td>${params.participants}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">בסקטות:</td><td><strong>${params.basketasRequired}</strong> (${params.basketasRequired * 4.5} ק"ג)</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">זמן ייצור משוער:</td><td><strong>~${Math.max(1, Math.ceil(params.basketasRequired / BASKETAS_PER_HOUR))} שעות</strong> (לפי 9 בסקטות בשעה)</td></tr>
      </table>

      ${params.notes ? `<div style="margin-top:16px;padding:12px;background:#fef3c7;border-right:3px solid #f59e0b;border-radius:6px;font-size:14px;"><strong>הערות:</strong> ${params.notes}</div>` : ''}

      <h3 style="margin-top:24px;font-size:15px;color:#111827;">🍦 טעמים (${params.flavors.length})</h3>
      <div>${flavorsList}</div>

      <h3 style="margin-top:24px;font-size:15px;color:#111827;">📋 רשימת הכנה</h3>
      <table style="width:100%;font-size:14px;color:#374151;">
        ${checklistHtml}
      </table>

      <div style="margin-top:24px;padding:14px;background:#fef3c7;border-radius:8px;font-size:13px;color:#92400e;">
        ⚠️ <strong>שים לב:</strong> צידניות שחורות שומרות קירור עד שעתיים. חובה להפעיל מקפיא בשטח ולקזז חצי שעת קירור.
      </div>

      <a href="${appUrl}/leads/${params.leadId}" style="display:inline-block;margin-top:20px;padding:10px 18px;background:#2563eb;color:white;border-radius:6px;text-decoration:none;font-size:14px;font-weight:500;">פתח את האירוע במערכת ←</a>
    </div>

    <div style="background:#f9fafb;padding:14px 24px;border-top:1px solid #e5e7eb;font-size:12px;color:#6b7280;text-align:center;">
      גולדה אירועים · מערכת ניהול פנימית
    </div>
  </div>
</body>
</html>
  `.trim()
}
