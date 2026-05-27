import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import nodemailer from 'nodemailer'
import { formatDate, formatTime } from '@/lib/utils'
import { EVENT_TYPE_LABELS, LEAD_STATUS_LABELS } from '@/lib/constants'

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Tomorrow's date in YYYY-MM-DD (UTC, matches Railway 06:00 UTC = 09:00 IL)
  const tomorrow = new Date()
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
  const tomorrowStr = tomorrow.toISOString().split('T')[0]

  const leads = await db.lead.findMany({
    where: {
      eventDate: tomorrowStr,
      status: { notIn: ['canceled', 'done'] },
    },
    include: {
      location: true,
      salesRep: true,
    },
    orderBy: { startTime: 'asc' },
  })

  if (leads.length === 0) {
    return NextResponse.json({ sent: false, message: 'אין אירועים מחר' })
  }

  const transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? 587),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  const rows = leads
    .map(
      (l) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${l.clientName}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${l.clientPhone}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${formatTime(l.startTime)}–${formatTime(l.endTime)}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${l.location?.cityName ?? '—'}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${l.participants} נפש</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${EVENT_TYPE_LABELS[l.eventType]}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${LEAD_STATUS_LABELS[l.status]}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${l.salesRep?.fullName ?? '—'}</td>
        </tr>`,
    )
    .join('')

  const html = `
    <div dir="rtl" style="font-family:sans-serif;max-width:700px;margin:auto">
      <h2 style="color:#1d4ed8">תזכורת אירועים — ${formatDate(tomorrowStr)}</h2>
      <p>מחר מתוכננים <strong>${leads.length}</strong> אירועים:</p>
      <table style="width:100%;border-collapse:collapse;text-align:right">
        <thead>
          <tr style="background:#f1f5f9">
            <th style="padding:8px">לקוח</th>
            <th style="padding:8px">טלפון</th>
            <th style="padding:8px">שעות</th>
            <th style="padding:8px">מיקום</th>
            <th style="padding:8px">משתתפים</th>
            <th style="padding:8px">סוג</th>
            <th style="padding:8px">סטטוס</th>
            <th style="padding:8px">נציג</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin-top:24px;color:#6b7280;font-size:12px">גולדה אירועים — תזכורת אוטומטית</p>
    </div>
  `

  await transport.sendMail({
    from: process.env.SMTP_USER,
    to: process.env.ADMIN_EMAIL,
    subject: `תזכורת: ${leads.length} אירועים מחר (${formatDate(tomorrowStr)})`,
    html,
  })

  return NextResponse.json({ sent: true, count: leads.length, date: tomorrowStr })
}
