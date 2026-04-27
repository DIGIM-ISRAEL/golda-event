import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { timesOverlap } from '@/lib/utils'
import nodemailer from 'nodemailer'

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

  if (status === 'closed') {
    const sameDayLeads = await db.lead.findMany({
      where: { eventDate: lead.eventDate, status: 'closed', id: { not: id } },
      include: { location: true },
    })

    for (const other of sameDayLeads) {
      if (timesOverlap(lead.startTime, lead.endTime, other.startTime, other.endTime)) {
        return NextResponse.json({
          error: `קיים אירוע חופף! ${other.clientName} — ${other.location?.cityName ?? ''} ${other.startTime.slice(0, 5)}–${other.endTime.slice(0, 5)}`,
        }, { status: 409 })
      }
    }
  }

  await db.lead.update({ where: { id }, data: { status } })

  if (status === 'closed') {
    try {
      const quote = await db.quote.findUnique({ where: { leadId: id } })

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `✅ עסקה נסגרה: ${lead.clientName}`,
        html: `
          <div dir="rtl" style="font-family:Arial;padding:20px">
            <h2>עסקה חדשה נסגרה!</h2>
            <p><strong>לקוח:</strong> ${lead.clientName}</p>
            <p><strong>טלפון:</strong> ${lead.clientPhone}</p>
            <p><strong>תאריך:</strong> ${lead.eventDate}</p>
            <p><strong>מיקום:</strong> ${lead.location?.cityName ?? '—'}</p>
            <p><strong>משתתפים:</strong> ${lead.participants}</p>
            ${quote ? `<p><strong>סכום:</strong> ₪${quote.totalPrice.toLocaleString()}</p>` : ''}
            <a href="${process.env.NEXT_PUBLIC_APP_URL}/leads/${id}"
               style="background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none">
              פתח ליד במערכת
            </a>
          </div>
        `,
      })
    } catch (e) {
      console.error('Email error:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
