import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { CHECKLIST_ITEMS, CATEGORY_LABELS, groupedItems } from '@/lib/checklist'
import { calculateInventory } from '@/lib/inventory'
import { formatDate, formatTime } from '@/lib/utils'

// Endpoint יורץ פעם ביום (Railway cron) ב-09:00.
// מוצא את כל האירועים שמתקיימים מחר ושולח תזכורת.
export async function GET(request: NextRequest) {
  // אימות secret
  const authHeader = request.headers.get('authorization')
  const expectedSecret = process.env.CRON_SECRET
  if (!expectedSecret || authHeader !== `Bearer ${expectedSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // מחר בפורמט YYYY-MM-DD
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

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

  return NextResponse.json({
    ok: true,
    date: tomorrowStr,
    eventsFound: events.length,
    results,
  })
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
}) {
  const groups = groupedItems()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const wazeUrl = `https://waze.com/ul?q=${encodeURIComponent(params.cityName)}`

  const checklistHtml = Object.entries(groups)
    .map(([category, items]) => {
      const rows = items
        .map(
          (item) =>
            `<tr><td style="padding:4px 0;">☐</td><td style="padding:4px 8px;">${item.label}</td></tr>`,
        )
        .join('')
      return `
        <tr><td colspan="2" style="padding-top:12px;font-weight:bold;color:#555;font-size:13px;">${CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]}</td></tr>
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
