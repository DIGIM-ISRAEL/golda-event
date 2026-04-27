import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { timesOverlap } from '@/lib/utils'
import type { Lead } from '@/lib/types'
import nodemailer from 'nodemailer'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await request.json()

  // Fetch current lead
  const { data: lead } = await supabase
    .from('leads')
    .select('*, location:locations(city_name)')
    .eq('id', id)
    .single()

  if (!lead) return NextResponse.json({ error: 'Lead not found' }, { status: 404 })

  // Double-booking check when closing
  if (status === 'closed') {
    const { data: sameDayLeads } = await supabase
      .from('leads')
      .select('*, location:locations(city_name)')
      .eq('event_date', lead.event_date)
      .eq('status', 'closed')
      .neq('id', id)

    for (const other of sameDayLeads ?? []) {
      if (timesOverlap(lead.start_time, lead.end_time, other.start_time, other.end_time)) {
        return NextResponse.json({
          error: `קיים אירוע חופף! ${other.client_name} — ${other.location?.city_name ?? ''} ${other.start_time?.slice(0,5)}–${other.end_time?.slice(0,5)}`,
        }, { status: 409 })
      }
    }
  }

  // Update status
  const { error } = await supabase.from('leads').update({ status }).eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Email notification when closed
  if (status === 'closed') {
    try {
      const { data: quote } = await supabase
        .from('quotes')
        .select('total_price')
        .eq('lead_id', id)
        .single()

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT ?? 587),
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      })

      await transporter.sendMail({
        from: process.env.SMTP_USER,
        to: process.env.ADMIN_EMAIL,
        subject: `✅ עסקה נסגרה: ${lead.client_name}`,
        html: `
          <div dir="rtl" style="font-family:Arial;padding:20px">
            <h2>עסקה חדשה נסגרה!</h2>
            <p><strong>לקוח:</strong> ${lead.client_name}</p>
            <p><strong>טלפון:</strong> ${lead.client_phone}</p>
            <p><strong>תאריך:</strong> ${lead.event_date}</p>
            <p><strong>מיקום:</strong> ${lead.location?.city_name ?? '—'}</p>
            <p><strong>משתתפים:</strong> ${lead.participants}</p>
            ${quote ? `<p><strong>סכום:</strong> ₪${quote.total_price.toLocaleString()}</p>` : ''}
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
