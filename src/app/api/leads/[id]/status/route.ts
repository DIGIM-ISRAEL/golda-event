import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { syncLeadCalendar } from '@/lib/calendar-sync'
import { findClosedConflict } from '@/lib/conflicts'
import { sendEmail } from '@/lib/email'
import { formatDate, formatTime } from '@/lib/utils'
import { formatNIS } from '@/lib/pricing'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const { status } = await request.json()

  const lead = await db.lead.findUnique({
    where: { id },
    include: { location: true },
  })

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  // עגלה אחת בלבד — סגירה נחסמת אם קיים אירוע סגור חופף
  if (status === 'closed') {
    const conflict = await findClosedConflict({
      eventDate: lead.eventDate,
      startTime: lead.startTime,
      endTime: lead.endTime,
      excludeLeadId: id,
    })
    if (conflict) return NextResponse.json({ error: conflict }, { status: 409 })
  }

  await db.lead.update({ where: { id }, data: { status } })

  // סנכרון Google Calendar — יוצר אירוע בסגירה, מוחק כשיוצאים מ"סגור"
  await syncLeadCalendar(id)

  // התראה למנהל על עסקה שנסגרה
  if (status === 'closed' && process.env.ADMIN_EMAIL) {
    const quote = await db.quote.findUnique({ where: { leadId: id } })

    await sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: `✅ עסקה נסגרה: ${lead.clientName}`,
      html: `
        <div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;text-align:right;">
          <h2 style="margin:0 0 12px;">עסקה חדשה נסגרה!</h2>
          <p><strong>לקוח:</strong> ${lead.clientName}</p>
          <p><strong>טלפון:</strong> ${lead.clientPhone}</p>
          <p><strong>תאריך:</strong> ${formatDate(lead.eventDate)} · ${formatTime(lead.startTime)}–${formatTime(lead.endTime)}</p>
          <p><strong>מיקום:</strong> ${lead.location?.cityName ?? '—'}</p>
          <p><strong>משתתפים:</strong> ${lead.participants}</p>
          ${quote ? `<p><strong>סכום:</strong> ${formatNIS(quote.totalPrice)}</p>` : ''}
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/leads/${id}"
             style="display:inline-block;margin-top:10px;background:#5E2A33;color:#FAF4E9;padding:10px 20px;border-radius:8px;text-decoration:none;">
            פתח ליד במערכת
          </a>
        </div>
      `,
    })
  }

  return NextResponse.json({ ok: true })
}
