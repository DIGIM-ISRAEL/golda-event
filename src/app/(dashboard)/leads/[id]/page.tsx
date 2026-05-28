import { notFound } from 'next/navigation'
import Link from 'next/link'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { calculatePrice, formatNIS } from '@/lib/pricing'
import { calculateInventory } from '@/lib/inventory'
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  CLIENT_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  OPERATIONAL_WARNING,
} from '@/lib/constants'
import { formatDate, formatTime, toWhatsAppNumber } from '@/lib/utils'
import ProfitabilityPanel from '@/components/leads/ProfitabilityPanel'
import StatusChanger from '@/components/leads/StatusChanger'
import SignatureLink from '@/components/leads/SignatureLink'
import EventChecklist from '@/components/leads/EventChecklist'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return notFound()

  const [lead, settingsRows] = await Promise.all([
    db.lead.findUnique({
      where: { id },
      include: {
        location: true,
        quote: true,
        flavors: { include: { flavor: true } },
      },
    }),
    db.settings.findMany().catch(() => [] as Awaited<ReturnType<typeof db.settings.findMany>>),
  ])

  if (!lead) notFound()

  // אזהרת התנגשות רכה — אירועים נוספים באותו יום (זמן נסיעה בין מיקומים)
  const sameDayEvents = await db.lead.findMany({
    where: {
      eventDate: lead.eventDate,
      status: { in: ['closed', 'quote_sent'] },
      id: { not: lead.id },
    },
    include: { location: true },
    orderBy: { startTime: 'asc' },
  })

  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))
  const basketaCost = Number(settingsMap['basketa_cost_nis'] ?? 150)
  const profitThreshold = Number(settingsMap['profit_warning_threshold'] ?? 1000)

  const flavors = lead.flavors.map((lf) => lf.flavor)
  const logisticsCost = lead.location?.travelCostNis ?? 0

  const pricing = lead.quote
    ? {
        totalPrice: lead.quote.totalPrice,
        vatAmount: lead.quote.vatAmount,
        balanceDue: lead.quote.balanceDue,
        advancePaid: lead.quote.advancePaid,
      }
    : calculatePrice({
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

  const inventory = calculateInventory(lead.participants, basketaCost)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{lead.clientName}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEAD_STATUS_COLORS[lead.status]}`}>
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
          </div>
          <a href={`tel:${lead.clientPhone}`} className="text-brand-maroon text-sm hover:underline" dir="ltr">
            {lead.clientPhone}
          </a>
        </div>
        <div className="flex gap-2">
          <Link href={`/leads/${id}/edit`} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
            ✏️ עריכה
          </Link>
          <a href={`/api/quotes/${id}/pdf`} target="_blank" className="px-4 py-2 bg-brand-maroon text-white rounded-lg text-sm font-medium hover:bg-brand-maroon-dark">
            📄 הצעת מחיר PDF
          </a>
          <a href={`/api/quotes/${id}/docx`} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
            📝 Word
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {sameDayEvents.length > 0 && (
            <div className="bg-orange-50 border border-orange-300 rounded-xl p-4">
              <div className="flex items-start gap-2">
                <span className="text-lg">🚗</span>
                <div className="text-sm text-orange-800">
                  <div className="font-semibold mb-1">
                    שים לב: {sameDayEvents.length} אירוע{sameDayEvents.length > 1 ? 'ים' : ''} נוסף{sameDayEvents.length > 1 ? 'ים' : ''} באותו יום
                  </div>
                  <div className="text-xs text-orange-700 mb-2">וודא שיש מספיק זמן נסיעה בין המיקומים (עגלה אחת בלבד):</div>
                  <ul className="space-y-1">
                    {sameDayEvents.map((e) => (
                      <li key={e.id}>
                        <span className="font-medium">{formatTime(e.startTime)}–{formatTime(e.endTime)}</span>
                        {' · '}{e.clientName}{' · '}{e.location?.cityName ?? '—'}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">פרטי אירוע</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div><dt className="text-gray-500">תאריך</dt><dd className="font-medium">{formatDate(lead.eventDate)}</dd></div>
              <div><dt className="text-gray-500">שעות</dt><dd className="font-medium">{formatTime(lead.startTime)} – {formatTime(lead.endTime)}</dd></div>
              <div><dt className="text-gray-500">מיקום</dt><dd className="font-medium">{lead.location?.cityName ?? '—'}</dd></div>
              <div><dt className="text-gray-500">משתתפים</dt><dd className="font-medium">{lead.participants}</dd></div>
              <div><dt className="text-gray-500">סוג לקוח</dt><dd className="font-medium">{CLIENT_TYPE_LABELS[lead.clientType]}</dd></div>
              <div><dt className="text-gray-500">סוג אירוע</dt><dd className="font-medium">{EVENT_TYPE_LABELS[lead.eventType]}</dd></div>
            </dl>
            {lead.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <dt className="text-gray-500 text-sm mb-1">הערות</dt>
                <dd className="text-sm text-gray-700">{lead.notes}</dd>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">טעמים שנבחרו ({flavors.length})</h2>
            <div className="flex flex-wrap gap-2">
              {flavors.map((f) => (
                <span key={f.id} className={`px-3 py-1 rounded-full text-sm ${f.category === 'dairy' ? 'bg-brand-mint text-brand-maroon-dark' : 'bg-green-100 text-green-800'}`}>
                  {f.name}
                </span>
              ))}
              {flavors.length === 0 && <span className="text-sm text-gray-400">לא נבחרו טעמים</span>}
            </div>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">תמחור</h2>
            <div className="space-y-2 text-sm">
              {pricing.vatAmount != null && (
                <div className="flex justify-between text-gray-600">
                  <span>לפני מע&quot;מ</span>
                  <span>{formatNIS(pricing.totalPrice - pricing.vatAmount)}</span>
                </div>
              )}
              {pricing.vatAmount != null && (
                <div className="flex justify-between text-gray-600">
                  <span>מע&quot;מ (18%)</span>
                  <span>{formatNIS(pricing.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>סה&quot;כ</span>
                <span className="text-brand-maroon-dark">{formatNIS(pricing.totalPrice)}</span>
              </div>
              {pricing.advancePaid > 0 && (
                <>
                  <div className="flex justify-between text-gray-600">
                    <span>מקדמה ששולמה</span>
                    <span>{formatNIS(pricing.advancePaid)}</span>
                  </div>
                  <div className="flex justify-between font-semibold text-orange-600">
                    <span>יתרה לתשלום</span>
                    <span>{formatNIS(pricing.balanceDue)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
            <h2 className="font-semibold text-amber-900 mb-3">🍦 מלאי נדרש</h2>
            <div className="grid grid-cols-3 gap-3 text-center mb-4">
              <div className="bg-white rounded-lg p-3">
                <div className="text-xl font-bold">{inventory.participants}</div>
                <div className="text-xs text-gray-500">משתתפים</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-xl font-bold">{inventory.gramsNeeded.toLocaleString()}</div>
                <div className="text-xs text-gray-500">גרם</div>
              </div>
              <div className="bg-white rounded-lg p-3">
                <div className="text-xl font-bold text-brand-maroon-dark">{inventory.basketasRequired}</div>
                <div className="text-xs text-gray-500">בסקטות</div>
              </div>
            </div>
            <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ {OPERATIONAL_WARNING}
            </div>
          </div>

          <EventChecklist
            leadId={id}
            initialCheckedItems={lead.checkedItems ?? []}
            basketasRequired={inventory.basketasRequired}
            flavors={flavors.map((f) => ({ name: f.name, category: f.category }))}
          />

          {lead.clientApprovedAt && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              ✅ הלקוח אישר את ההצעה — {lead.clientApprovedName} ·{' '}
              {new Date(lead.clientApprovedAt).toLocaleString('he-IL')}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <StatusChanger leadId={id} currentStatus={lead.status} />

          {session.role === 'admin' && (
            <ProfitabilityPanel
              totalCustomerPrice={pricing.totalPrice}
              logisticsCost={logisticsCost}
              managerIncluded={lead.managerIncluded}
              assistantsCount={lead.assistantsCount}
              participants={lead.participants}
              basketaCostNis={basketaCost}
              profitWarningThreshold={profitThreshold}
            />
          )}

          {/* פעולות יצירת קשר מהירות */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={`tel:${lead.clientPhone}`}
              className="flex items-center justify-center gap-2 bg-brand-maroon text-white rounded-xl py-3 text-sm font-medium hover:bg-brand-maroon-dark transition-colors"
            >
              📞 התקשר
            </a>
            <a
              href={`https://wa.me/${toWhatsAppNumber(lead.clientPhone)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-600 text-white rounded-xl py-3 text-sm font-medium hover:bg-green-700 transition-colors"
            >
              💬 WhatsApp
            </a>
          </div>

          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">חתימה דיגיטלית</h3>
            <p className="text-xs text-gray-500 mb-3">שלח ללקוח לאישור ההצעה:</p>
            <SignatureLink url={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/approve/${lead.signatureToken}`} />
          </div>

          {lead.location && (
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(lead.location.cityName)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-brand-mint border border-brand-tan rounded-xl p-4 text-sm text-brand-maroon-dark hover:bg-brand-mint"
            >
              🗺️ פתח ב-Waze — {lead.location.cityName}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
