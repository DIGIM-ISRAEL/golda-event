import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { syncLeadCalendar } from '@/lib/calendar-sync'
import { timesOverlap, formatDate, formatTime } from '@/lib/utils'
import { formatNIS } from '@/lib/pricing'
import { getAppUrl } from '@/lib/app-url'

// אישור הצעה על ידי הלקוח (ציבורי, דרך טוקן ייחודי):
//  1. מתעד שם, חתימה, IP וזמן אישור
//  2. סוגר את העסקה אוטומטית (אם אין התנגשות ביומן — עגלה אחת!)
//  3. מסנכרן את יומן גוגל
//  4. שולח התראה במייל לנציג ולמנהל
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params
  const { name, signature } = await request.json()

  if (!name?.trim()) {
    return NextResponse.json({ error: 'שם חסר' }, { status: 400 })
  }

  const lead = await db.lead.findUnique({
    where: { signatureToken: token },
    include: { location: true, quote: true, salesRep: true },
  })

  if (!lead) {
    return NextResponse.json({ error: 'קישור לא תקף' }, { status: 404 })
  }

  // אישור חוזר — לא מעבדים שוב (ההצעה כבר אושרה ונקלטה)
  if (lead.clientApprovedAt) {
    return NextResponse.json({ ok: true, alreadyApproved: true })
  }

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    null

  // בדיקת התנגשות קשה — אירוע סגור אחר באותן שעות (יש רק עגלה אחת)
  let conflictNote: string | null = null
  const canAutoClose = lead.status === 'lead' || lead.status === 'quote_sent'
  if (canAutoClose) {
    const sameDayClosed = await db.lead.findMany({
      where: { eventDate: lead.eventDate, status: 'closed', id: { not: lead.id } },
      include: { location: true },
    })
    const conflicting = sameDayClosed.find((other) =>
      timesOverlap(lead.startTime, lead.endTime, other.startTime, other.endTime),
    )
    if (conflicting) {
      conflictNote = `${conflicting.clientName} — ${conflicting.location?.cityName ?? ''} ${formatTime(conflicting.startTime)}–${formatTime(conflicting.endTime)}`
    }
  }

  const autoClosed = canAutoClose && !conflictNote

  await db.lead.update({
    where: { signatureToken: token },
    data: {
      clientApprovedAt: new Date(),
      clientApprovedName: name.trim(),
      clientApprovedIp: ip,
      clientSignature:
        typeof signature === 'string' && signature.startsWith('data:image') ? signature : null,
      ...(autoClosed ? { status: 'closed' as const } : {}),
    },
  })

  // יצירת אירוע ביומן גוגל (רק אם נסגר)
  if (autoClosed) {
    await syncLeadCalendar(lead.id)
  }

  // התראה במייל לנציג ולמנהל — שלא יפספסו אישור של לקוח
  try {
    const recipients = new Set<string>()
    if (process.env.ADMIN_EMAIL) recipients.add(process.env.ADMIN_EMAIL)
    if (lead.salesRep?.email) recipients.add(lead.salesRep.email)

    if (recipients.size > 0) {
      const appUrl = getAppUrl()
      const statusLine = autoClosed
        ? '<p style="color:#3D5A30;font-weight:bold;">✅ העסקה נסגרה אוטומטית ונוספה ליומן.</p>'
        : conflictNote
          ? `<p style="color:#B0473A;font-weight:bold;">⚠️ הסטטוס לא עודכן אוטומטית — קיים אירוע סגור חופף: ${conflictNote}. נדרש טיפול ידני.</p>`
          : ''

      await sendEmail({
        to: Array.from(recipients),
        subject: `🎉 הלקוח אישר את ההצעה — ${lead.clientName}`,
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;text-align:right;">
            <h2 style="margin:0 0 12px;">הלקוח אישר וחתם על ההצעה!</h2>
            <p><strong>לקוח:</strong> ${lead.clientName} (נחתם ע"י ${name.trim()})</p>
            <p><strong>טלפון:</strong> ${lead.clientPhone}</p>
            <p><strong>תאריך אירוע:</strong> ${formatDate(lead.eventDate)} · ${formatTime(lead.startTime)}–${formatTime(lead.endTime)}</p>
            <p><strong>מיקום:</strong> ${lead.location?.cityName ?? '—'}</p>
            <p><strong>משתתפים:</strong> ${lead.participants}</p>
            ${lead.quote ? `<p><strong>סכום:</strong> ${formatNIS(lead.quote.totalPrice)}</p>` : ''}
            ${statusLine}
            <a href="${appUrl}/leads/${lead.id}"
               style="display:inline-block;margin-top:10px;background:#5E2A33;color:#FAF4E9;padding:10px 20px;border-radius:8px;text-decoration:none;">
              פתח את הליד במערכת
            </a>
          </div>
        `,
      })
    }
  } catch (err) {
    // מייל הוא best-effort — האישור עצמו כבר נקלט
    console.error('Approval notification email failed:', err)
  }

  return NextResponse.json({ ok: true, autoClosed })
}
