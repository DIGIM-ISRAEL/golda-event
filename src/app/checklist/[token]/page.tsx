import { CalendarDays, Clock, MapPin, Users } from 'lucide-react'
import { db } from '@/lib/db'
import { formatDate, formatTime } from '@/lib/utils'
import StripeBar from '@/components/brand/StripeBar'
import PublicEventChecklist from '@/components/leads/PublicEventChecklist'
import type { EventLog } from '@/lib/event-cost'

export const dynamic = 'force-dynamic'

// עמוד צ'קליסט ציבורי לעובד — נגיש דרך טוקן בלבד, בלי התחברות.
export default async function PublicChecklistPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const [lead, settingsRows] = await Promise.all([
    db.lead
      .findUnique({
        where: { signatureToken: token },
        include: { location: true, flavors: { include: { flavor: true } } },
      })
      .catch(() => null),
    db.settings.findMany().catch(() => [] as { key: string; value: string }[]),
  ])

  if (!lead) {
    return (
      <Shell>
        <div className="px-8 py-14 text-center">
          <h1 className="font-serif text-2xl font-bold text-brand-ink mb-2">הקישור אינו תקף</h1>
          <p className="text-sm text-brand-muted">פנו למנהל לקבלת קישור מעודכן.</p>
        </div>
      </Shell>
    )
  }

  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))
  const basketaCost = Number(settingsMap['basketa_cost_nis'] ?? 150)
  const flavors = lead.flavors.map((lf) => lf.flavor)

  return (
    <Shell>
      <div className="text-center px-8 pt-8 pb-5 bg-gradient-to-b from-[#FCF7EE] to-white border-b border-brand-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/tree-logo.png" alt="גולדה" className="mx-auto h-16 w-auto" />
        <h1 className="font-serif text-xl font-bold text-brand-ink mt-3">צ&apos;קליסט אירוע — {lead.clientName}</h1>
      </div>

      <div className="px-5 sm:px-7 py-6">
        {/* פרטי האירוע */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-5 text-sm">
          <Detail icon={<CalendarDays size={15} />} label="תאריך" value={formatDate(lead.eventDate)} />
          <Detail
            icon={<Clock size={15} />}
            label="שעות"
            value={<span dir="ltr">{formatTime(lead.startTime)} – {formatTime(lead.endTime)}</span>}
          />
          <Detail icon={<MapPin size={15} />} label="מיקום" value={lead.location?.cityName ?? '—'} />
          <Detail icon={<Users size={15} />} label="משתתפים" value={lead.participants} />
        </div>

        <PublicEventChecklist
          token={token}
          status={lead.status}
          participants={lead.participants}
          flavors={flavors.map((f) => ({ id: f.id, name: f.name, costPerBasketa: f.costPerBasketa }))}
          flavorsForPrep={flavors.map((f) => ({ name: f.name, category: f.category }))}
          initialCheckedItems={lead.checkedItems ?? []}
          initialCustomItems={lead.customChecklistItems ?? []}
          initialEventLog={(lead.eventLog as EventLog | null) ?? null}
          fallbackBasketaCost={basketaCost}
        />
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream flex items-start sm:items-center justify-center p-4 py-8">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-brand-line shadow-[0_1px_2px_rgba(94,42,51,0.04),0_24px_60px_-32px_rgba(94,42,51,0.4)] overflow-hidden">
        <StripeBar height={6} />
        {children}
      </div>
    </div>
  )
}

function Detail({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="text-brand-gold/80 mt-0.5 shrink-0">{icon}</span>
      <div className="min-w-0">
        <div className="text-xs text-brand-muted">{label}</div>
        <div className="text-sm font-medium text-brand-ink mt-0.5">{value}</div>
      </div>
    </div>
  )
}
