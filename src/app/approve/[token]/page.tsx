import { headers } from 'next/headers'
import { CalendarDays, Clock, MapPin, Users, PartyPopper, CheckCircle2 } from 'lucide-react'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { notifyQuoteViewed } from '@/lib/notifications'
import { calculatePrice, formatNIS } from '@/lib/pricing'
import { formatDate, formatTime } from '@/lib/utils'
import { EVENT_TYPE_LABELS, DEFAULT_INCLUDED_ITEMS } from '@/lib/constants'
import StripeBar from '@/components/brand/StripeBar'
import ApprovalForm from '@/components/approve/ApprovalForm'
import DepositBox from '@/components/approve/DepositBox'

export const dynamic = 'force-dynamic'

// בוטים של תצוגה מקדימה (וואטסאפ/פייסבוק/טלגרם...) פותחים את הקישור ברגע השליחה —
// אסור שהם יסמנו "נצפה" ויקפיצו התראה לפני שהלקוח באמת פתח.
const PREVIEW_BOT_RE = /whatsapp|facebookexternalhit|telegram|skype|slack|twitter|linkedin|discord|bot|crawler|spider|preview|curl|wget/i

// עמוד אישור ציבורי — הלקוח רואה את הצעת המחיר המלאה וחותם עליה באותו מקום.
// נגיש ללא התחברות (דרך טוקן ייחודי בלבד).
export default async function ApprovePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const [lead, settingsRows, session, headerList] = await Promise.all([
    db.lead
      .findUnique({
        where: { signatureToken: token },
        include: { location: true, quote: true, flavors: { include: { flavor: true } }, salesRep: true },
      })
      .catch(() => null),
    db.settings.findMany().catch(() => [] as { key: string; value: string }[]),
    getSession(),
    headers(),
  ])

  if (!lead) {
    return (
      <Shell>
        <div className="px-8 py-14 text-center">
          <h1 className="font-serif text-2xl font-bold text-brand-ink mb-2">הקישור אינו תקף</h1>
          <p className="text-sm text-brand-muted">פנו לנציג המכירות שלכם לקבלת קישור מעודכן.</p>
        </div>
      </Shell>
    )
  }

  const flavors = lead.flavors.map((lf) => lf.flavor)
  const includes = lead.includedItems.length > 0 ? lead.includedItems : DEFAULT_INCLUDED_ITEMS
  const logisticsCost = lead.location?.travelCostNis ?? 0
  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))

  const pricing = lead.quote
    ? {
        totalPrice: lead.quote.totalPrice,
        vatAmount: lead.quote.vatAmount,
        advancePaid: lead.quote.advancePaid,
        balanceDue: lead.quote.balanceDue,
      }
    : (() => {
        const p = calculatePrice({
          clientType: lead.clientType,
          participants: lead.participants,
          logisticsCost,
          extras: [],
          discountType: null,
          discountValue: 0,
          advancePaid: 0,
          priceOverride: lead.priceOverride,
          pricePerPersonOverride: lead.pricePerPersonOverride,
        })
        return {
          totalPrice: p.totalPrice,
          vatAmount: p.vatAmount,
          advancePaid: p.advancePaid,
          balanceDue: p.balanceDue,
        }
      })()

  const alreadyApproved = !!lead.clientApprovedAt

  // תיעוד צפייה ראשונה — רק לקוח אמיתי: לא נציג מחובר ולא בוט תצוגה-מקדימה
  const userAgent = headerList.get('user-agent') ?? ''
  const isRealClientView = !session && !PREVIEW_BOT_RE.test(userAgent)
  if (!lead.quoteViewedAt && !alreadyApproved && isRealClientView) {
    await db.lead
      .update({ where: { id: lead.id }, data: { quoteViewedAt: new Date() } })
      .catch(() => {})
    // ההתראה יוצאת ברקע — לא מעכבת את טעינת העמוד ללקוח
    void notifyQuoteViewed({
      leadId: lead.id,
      clientName: lead.clientName,
      clientPhone: lead.clientPhone,
      eventDate: lead.eventDate,
      totalPrice: lead.quote?.totalPrice ?? null,
      salesRepEmail: lead.salesRep?.email,
    }).catch((err) => console.error('Quote viewed notification failed:', err))
  }

  // מקדמה — מוצגת ללקוח אחרי החתימה (אם הוגדרה בהגדרות המערכת)
  const depositPercent = Number(settingsMap['deposit_percent'] ?? 0)
  const depositInstructions = (settingsMap['deposit_instructions'] ?? '').trim()
  const depositLink = (settingsMap['deposit_link'] ?? '').trim()
  const depositAmount =
    depositPercent > 0 ? Math.round((pricing.totalPrice * depositPercent) / 100) : 0
  const deposit =
    depositAmount > 0 && (depositInstructions || depositLink)
      ? { amount: depositAmount, percent: depositPercent, instructions: depositInstructions, link: depositLink }
      : null

  return (
    <Shell>
      {/* כותרת מותגית */}
      <div className="text-center px-8 pt-9 pb-6 bg-gradient-to-b from-[#FCF7EE] to-white border-b border-brand-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/tree-logo.png" alt="גולדה — גלידה ישראלית" className="mx-auto h-24 w-auto" />
        <h1 className="font-serif text-2xl font-bold text-brand-ink mt-4">הצעת מחיר</h1>
        <p className="text-sm text-brand-gold-deep mt-1.5 tracking-wide" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
          גולדה · גלידה ישראלית
        </p>
      </div>

      <div className="px-6 sm:px-8 py-7">
        <p className="text-sm text-brand-ink/85 leading-relaxed mb-6">
          שלום {lead.clientName}, שמחים להגיש לכם את הצעת המחיר לאירוע שלכם. 🍦
        </p>

        {/* פרטי האירוע */}
        <SectionTitle>פרטי האירוע</SectionTitle>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 mb-7">
          <Detail icon={<CalendarDays size={15} />} label="תאריך" value={formatDate(lead.eventDate)} />
          <Detail
            icon={<Clock size={15} />}
            label="שעות"
            value={
              <span dir="ltr" className="inline-block">
                {formatTime(lead.startTime)} – {formatTime(lead.endTime)}
              </span>
            }
          />
          <Detail icon={<MapPin size={15} />} label="מיקום" value={lead.location?.cityName ?? '—'} />
          <Detail icon={<Users size={15} />} label="משתתפים" value={lead.participants} />
          <Detail icon={<PartyPopper size={15} />} label="סוג אירוע" value={EVENT_TYPE_LABELS[lead.eventType]} />
        </div>

        {/* מה ההצעה כוללת */}
        <SectionTitle>מה ההצעה כוללת</SectionTitle>
        <ul className="space-y-2 mb-7">
          {includes.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-brand-ink">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-gold shrink-0" aria-hidden />
              {item}
            </li>
          ))}
        </ul>

        {/* טעמים */}
        {flavors.length > 0 && (
          <>
            <SectionTitle>הטעמים שנבחרו ({flavors.length})</SectionTitle>
            <div className="flex flex-wrap gap-2 mb-7">
              {flavors.map((f) => (
                <span key={f.id} className="px-3 py-1 rounded-full text-sm bg-brand-mint text-brand-maroon-dark">
                  {f.name}
                </span>
              ))}
            </div>
          </>
        )}

        {/* תמחור */}
        <SectionTitle>תמחור</SectionTitle>
        <div className="rounded-2xl bg-brand-cream/70 border border-brand-line/70 p-5 mb-3 space-y-2.5 text-sm">
          {lead.clientType === 'institutional' && pricing.vatAmount != null && (
            <>
              <div className="flex justify-between text-brand-muted">
                <span>מחיר לפני מע&quot;מ</span>
                <span dir="ltr">{formatNIS(pricing.totalPrice - pricing.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-brand-muted">
                <span>מע&quot;מ (18%)</span>
                <span dir="ltr">{formatNIS(pricing.vatAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between items-baseline pt-2 border-t border-brand-line/80">
            <span className="font-serif text-base font-semibold text-brand-ink">סה&quot;כ לתשלום</span>
            <span dir="ltr" className="font-serif text-2xl font-bold text-brand-maroon">
              {formatNIS(pricing.totalPrice)}
            </span>
          </div>
          {pricing.advancePaid > 0 && (
            <>
              <div className="flex justify-between text-brand-muted">
                <span>מקדמה ששולמה</span>
                <span dir="ltr">{formatNIS(pricing.advancePaid)}</span>
              </div>
              <div className="flex justify-between font-semibold text-brand-gold-deep">
                <span>יתרה לתשלום</span>
                <span dir="ltr">{formatNIS(pricing.balanceDue)}</span>
              </div>
            </>
          )}
        </div>

        <p className="text-xs text-brand-muted leading-relaxed mb-8">
          ההצעה בתוקף ל-14 יום ממועד הוצאתה. ביטול עד 72 שעות לפני האירוע — ללא חיוב. ביטול בפחות
          מ-72 שעות — חיוב 50% מערך ההזמנה.
        </p>

        <div className="border-t border-brand-line pt-7">
          {alreadyApproved ? (
            <>
              <div className="flex items-start gap-3 rounded-2xl bg-[#EAF1E3] border border-[#C8DABA] p-4 text-sm text-[#3D5A30]">
                <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
                <span>
                  ההצעה אושרה ונחתמה{lead.clientApprovedName ? ` על ידי ${lead.clientApprovedName}` : ''} ·{' '}
                  {lead.clientApprovedAt!.toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}.
                  <br />
                  נציג שלנו יצור קשר בקרוב להמשך התיאום. 🍦
                </span>
              </div>
              {deposit && <DepositBox deposit={deposit} />}
            </>
          ) : (
            <ApprovalForm token={token} deposit={deposit} />
          )}
        </div>
      </div>
    </Shell>
  )
}

/* ── מעטפת עמוד ממותגת ─────────────────────────────── */
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="font-serif text-[15px] font-bold text-brand-gold-deep mb-3 flex items-center gap-2">
      <span className="h-4 w-1 rounded-full bg-brand-gold/70" aria-hidden />
      {children}
    </h2>
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
