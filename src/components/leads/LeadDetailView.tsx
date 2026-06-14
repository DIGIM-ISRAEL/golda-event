// תצוגת פרטי ליד — שכבת מצג טהורה (ללא DB/hooks) כדי שתשמש גם את עמוד השרת
// וגם את מסך התצוגה לעיצוב. רכיבי קליינט (שינוי סטטוס, רווחיות, חתימה, צ'קליסט)
// מוזרקים כ-slots כדי לשמור על ההפרדה.
import Link from 'next/link'
import {
  Pencil,
  FileText,
  FileType,
  Phone,
  MessageCircle,
  Navigation,
  PenLine,
  Car,
  CheckCircle2,
  Calendar,
  Clock,
  MapPin,
  Users,
  Building2,
  PartyPopper,
  IceCreamCone,
  AlertTriangle,
  Eye,
} from 'lucide-react'
import { Card, CardHeader, StatusBadge } from '@/components/ui'
import { formatDate, formatTime } from '@/lib/utils'
import { formatNIS } from '@/lib/pricing'

export interface LeadDetailFlavor {
  id: string
  name: string
  category: string
}

export interface LeadDetailViewProps {
  id: string
  clientName: string
  clientPhone: string
  status: string
  eventDate: string | Date
  startTime: string
  endTime: string
  cityName: string | null
  participants: number
  clientTypeLabel: string
  eventTypeLabel: string
  notes?: string | null
  flavors: LeadDetailFlavor[]
  pricing: {
    totalPrice: number
    vatAmount: number | null
    balanceDue: number
    advancePaid: number
  }
  inventory: { participants: number; gramsNeeded: number; basketasRequired: number }
  sameDayEvents: {
    id: string
    startTime: string
    endTime: string
    clientName: string
    cityName: string | null
  }[]
  operationalWarning: string
  clientApproved?: { name: string | null; at: string | Date } | null
  quoteViewedAt?: string | Date | null
  pdfHref: string
  docxHref: string
  editHref: string
  telHref: string
  whatsappHref: string
  wazeHref?: string | null
  // slots — רכיבי קליינט
  statusChanger: React.ReactNode
  profitabilityPanel?: React.ReactNode
  signatureLink: React.ReactNode
  sendQuoteButton: React.ReactNode
  waQuickSend?: React.ReactNode
  checklist: React.ReactNode
}

const actionBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold tracking-wide transition-colors'

export default function LeadDetailView(props: LeadDetailViewProps) {
  const {
    clientName,
    clientPhone,
    status,
    eventDate,
    startTime,
    endTime,
    cityName,
    participants,
    clientTypeLabel,
    eventTypeLabel,
    notes,
    flavors,
    pricing,
    inventory,
    sameDayEvents,
    operationalWarning,
    clientApproved,
    quoteViewedAt,
    pdfHref,
    docxHref,
    editHref,
    telHref,
    whatsappHref,
    wazeHref,
    statusChanger,
    profitabilityPanel,
    signatureLink,
    sendQuoteButton,
    waQuickSend,
    checklist,
  } = props

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      {/* כותרת */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="h-6 w-1.5 rounded-full bg-brand-gold/70 shrink-0" aria-hidden />
            <h1 className="font-serif text-2xl md:text-[28px] font-bold text-brand-ink leading-none">
              {clientName}
            </h1>
            <StatusBadge status={status} />
          </div>
          <a
            href={telHref}
            dir="ltr"
            className="inline-flex items-center gap-1.5 text-sm text-brand-gold-deep hover:text-brand-maroon transition-colors mt-2.5 mr-4"
          >
            <Phone size={14} />
            {clientPhone}
          </a>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={editHref}
            className={`${actionBtn} bg-white text-brand-gold-deep border border-brand-gold/40 hover:border-brand-gold hover:bg-brand-cream/60`}
          >
            <Pencil size={16} />
            עריכה
          </Link>
          <a
            href={pdfHref}
            target="_blank"
            className={`${actionBtn} bg-brand-maroon text-brand-cream hover:bg-brand-maroon-dark shadow-sm`}
          >
            <FileText size={16} />
            הצעת מחיר PDF
          </a>
          <a
            href={docxHref}
            className={`${actionBtn} bg-white text-brand-gold-deep border border-brand-gold/40 hover:border-brand-gold hover:bg-brand-cream/60`}
          >
            <FileType size={16} />
            Word
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 md:gap-6">
        <div className="lg:col-span-2 space-y-5">
          {sameDayEvents.length > 0 && (
            <div className="rounded-2xl border border-brand-gold/35 bg-[#F8F0DF] p-4">
              <div className="flex items-start gap-3">
                <span className="grid place-items-center h-9 w-9 rounded-full bg-brand-gold/15 text-brand-gold-deep shrink-0">
                  <Car size={18} />
                </span>
                <div className="text-sm text-brand-ink min-w-0">
                  <div className="font-semibold mb-0.5">
                    שים לב: {sameDayEvents.length} אירוע{sameDayEvents.length > 1 ? 'ים' : ''} נוסף
                    {sameDayEvents.length > 1 ? 'ים' : ''} באותו יום
                  </div>
                  <div className="text-xs text-brand-muted mb-2">
                    וודא שיש מספיק זמן נסיעה בין המיקומים (עגלה אחת בלבד):
                  </div>
                  <ul className="space-y-1">
                    {sameDayEvents.map((e) => (
                      <li key={e.id} className="text-xs text-brand-ink/80">
                        <span dir="ltr" className="font-semibold text-brand-gold-deep">
                          {formatTime(e.startTime)}–{formatTime(e.endTime)}
                        </span>
                        {' · '}
                        {e.clientName}
                        {' · '}
                        {e.cityName ?? '—'}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* פרטי אירוע */}
          <Card>
            <CardHeader title="פרטי אירוע" />
            <div className="p-5">
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
                <Field icon={Calendar} label="תאריך" value={formatDate(eventDate)} />
                <Field
                  icon={Clock}
                  label="שעות"
                  value={
                    <span dir="ltr" className="inline-block">
                      {formatTime(startTime)} – {formatTime(endTime)}
                    </span>
                  }
                />
                <Field icon={MapPin} label="מיקום" value={cityName ?? '—'} />
                <Field icon={Users} label="משתתפים" value={participants} />
                <Field icon={Building2} label="סוג לקוח" value={clientTypeLabel} />
                <Field icon={PartyPopper} label="סוג אירוע" value={eventTypeLabel} />
              </dl>
              {notes && (
                <div className="mt-5 pt-4 border-t border-brand-line/70">
                  <dt className="text-xs text-brand-muted mb-1">הערות</dt>
                  <dd className="text-sm text-brand-ink/90 leading-relaxed whitespace-pre-line">
                    {notes}
                  </dd>
                </div>
              )}
            </div>
          </Card>

          {/* טעמים */}
          <Card>
            <CardHeader title={`טעמים שנבחרו (${flavors.length})`} />
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {flavors.map((f) => (
                  <span
                    key={f.id}
                    className={`px-3 py-1 rounded-full text-sm ${
                      f.category === 'dairy'
                        ? 'bg-[#E3EEDD] text-[#456B38]'
                        : 'bg-[#F4E8D6] text-brand-gold-deep'
                    }`}
                  >
                    {f.name}
                  </span>
                ))}
                {flavors.length === 0 && (
                  <span className="text-sm text-brand-muted/70">לא נבחרו טעמים</span>
                )}
              </div>
            </div>
          </Card>

          {/* תמחור */}
          <Card>
            <CardHeader title="תמחור" />
            <div className="p-5 space-y-2.5 text-sm">
              {pricing.vatAmount != null && (
                <div className="flex justify-between text-brand-muted">
                  <span>לפני מע&quot;מ</span>
                  <span dir="ltr">{formatNIS(pricing.totalPrice - pricing.vatAmount)}</span>
                </div>
              )}
              {pricing.vatAmount != null && (
                <div className="flex justify-between text-brand-muted">
                  <span>מע&quot;מ (18%)</span>
                  <span dir="ltr">{formatNIS(pricing.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-2 border-t border-brand-line/70">
                <span className="font-serif text-base font-semibold text-brand-ink">סה&quot;כ</span>
                <span dir="ltr" className="font-serif text-xl font-bold text-brand-maroon">
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
          </Card>

          {/* מלאי נדרש */}
          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <IceCreamCone size={16} className="text-brand-gold" />
                  מלאי נדרש
                </span>
              }
            />
            <div className="p-5">
              <div className="grid grid-cols-3 gap-3 text-center mb-4">
                <div className="rounded-xl bg-brand-cream/70 border border-brand-line/60 p-3">
                  <div className="font-serif text-2xl font-bold text-brand-ink">
                    {inventory.participants}
                  </div>
                  <div className="text-xs text-brand-muted mt-0.5">משתתפים</div>
                </div>
                <div className="rounded-xl bg-brand-cream/70 border border-brand-line/60 p-3">
                  <div className="font-serif text-2xl font-bold text-brand-ink">
                    {inventory.gramsNeeded.toLocaleString()}
                  </div>
                  <div className="text-xs text-brand-muted mt-0.5">גרם</div>
                </div>
                <div className="rounded-xl bg-brand-cream/70 border border-brand-line/60 p-3">
                  <div className="font-serif text-2xl font-bold text-brand-maroon">
                    {inventory.basketasRequired}
                  </div>
                  <div className="text-xs text-brand-muted mt-0.5">בסקטות</div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-xl bg-[#F8F0DF] border border-brand-gold/30 p-3 text-sm text-brand-ink/80">
                <AlertTriangle size={15} className="text-brand-gold-deep shrink-0 mt-0.5" />
                <span>{operationalWarning}</span>
              </div>
            </div>
          </Card>

          {checklist}

          {clientApproved && (
            <div className="flex items-start gap-3 rounded-2xl bg-[#EAF1E3] border border-[#C8DABA] p-4 text-sm text-[#3D5A30]">
              <CheckCircle2 size={18} className="shrink-0 mt-0.5" />
              <span>
                הלקוח אישר את ההצעה — {clientApproved.name} ·{' '}
                {new Date(clientApproved.at).toLocaleString('he-IL')}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-5">
          {statusChanger}

          {profitabilityPanel}

          {/* פעולות יצירת קשר מהירות */}
          <div className="grid grid-cols-2 gap-2.5">
            <a
              href={telHref}
              className="flex items-center justify-center gap-2 bg-brand-maroon text-brand-cream rounded-xl py-3 text-sm font-semibold hover:bg-brand-maroon-dark transition-colors"
            >
              <Phone size={16} />
              התקשר
            </a>
            <a
              href={whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-[#4F7A43] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#456B3A] transition-colors"
            >
              <MessageCircle size={16} />
              WhatsApp
            </a>
          </div>

          <Card>
            <CardHeader
              title={
                <span className="flex items-center gap-2">
                  <PenLine size={15} className="text-brand-gold" />
                  שליחת הצעה ללקוח
                </span>
              }
            />
            <div className="p-5">
              {quoteViewedAt && !clientApproved && (
                <div className="flex items-start gap-2 rounded-xl bg-[#F8F0DF] border border-brand-gold/35 px-3 py-2.5 text-xs text-brand-ink/85 mb-3">
                  <Eye size={14} className="text-brand-gold-deep shrink-0 mt-0.5" />
                  <span>
                    <span className="font-semibold">הלקוח צפה בהצעה</span> ·{' '}
                    {new Date(quoteViewedAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}
                    <br />
                    רוב העסקאות נסגרות ביממה שאחרי הצפייה — שווה להתקשר.
                  </span>
                </div>
              )}
              {sendQuoteButton}
              <p className="text-xs text-brand-muted mb-2">
                ההודעה כוללת את תקציר ההצעה וקישור לצפייה, אישור וחתימה דיגיטלית.
              </p>
              <p className="text-xs text-brand-muted mb-1.5">או העתק את הקישור ידנית:</p>
              {signatureLink}
              {waQuickSend && (
                <div className="mt-4 pt-4 border-t border-brand-line/70">{waQuickSend}</div>
              )}
            </div>
          </Card>

          {wazeHref && (
            <a
              href={wazeHref}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2.5 bg-brand-mint/60 border border-brand-line rounded-2xl p-4 text-sm font-medium text-brand-maroon-dark hover:bg-brand-mint transition-colors"
            >
              <Navigation size={16} className="text-brand-gold-deep shrink-0" />
              פתח ב-Waze — {cityName}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── שדה פרטים עם אייקון ─────────────────────────────── */
function Field({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon size={15} className="text-brand-gold/70 mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-xs text-brand-muted">{label}</dt>
        <dd className="text-sm font-medium text-brand-ink mt-0.5">{value}</dd>
      </div>
    </div>
  )
}
