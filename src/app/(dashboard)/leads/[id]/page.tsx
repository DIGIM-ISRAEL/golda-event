import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { calculatePrice, formatNIS } from '@/lib/pricing'
import { calculateInventory } from '@/lib/inventory'
import {
  LEAD_STATUS_LABELS,
  LEAD_STATUS_COLORS,
  CLIENT_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  OPERATIONAL_WARNING,
} from '@/lib/constants'
import { formatDate, formatTime } from '@/lib/utils'
import ProfitabilityPanel from '@/components/leads/ProfitabilityPanel'
import StatusChanger from '@/components/leads/StatusChanger'
import type { Lead } from '@/lib/types'

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { data: lead },
    { data: profile },
    { data: settings },
  ] = await Promise.all([
    supabase
      .from('leads')
      .select(`
        *,
        location:locations(*),
        flavors:lead_flavors(flavor:flavors(*)),
        quote:quotes(*),
        sales_rep:profiles(full_name)
      `)
      .eq('id', id)
      .single(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.from('settings').select('*'),
  ])

  if (!lead) notFound()

  const role = profile?.role ?? 'sales'
  const basketaCost = Number(settings?.find((s: { key: string }) => s.key === 'basketa_cost_nis')?.value ?? 150)
  const profitThreshold = Number(settings?.find((s: { key: string }) => s.key === 'profit_warning_threshold')?.value ?? 1000)

  const flavors = lead.flavors?.map((f: { flavor: { id: string; name: string; category: string } }) => f.flavor) ?? []
  const quote = Array.isArray(lead.quote) ? lead.quote[0] : lead.quote

  const logisticsCost = lead.location?.travel_cost_nis ?? 0

  const pricing = quote
    ? {
        totalPrice: quote.total_price,
        vatAmount: quote.vat_amount,
        balanceDue: quote.balance_due,
        advancePaid: quote.advance_paid,
      }
    : calculatePrice({
        clientType: lead.client_type,
        participants: lead.participants,
        logisticsCost,
        extras: [],
        discountType: null,
        discountValue: 0,
        advancePaid: 0,
        priceOverride: lead.price_override,
        pricePerPersonOverride: lead.price_per_person_override,
      })

  const inventory = calculateInventory(lead.participants, basketaCost)

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-gray-900">{lead.client_name}</h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${LEAD_STATUS_COLORS[lead.status]}`}>
              {LEAD_STATUS_LABELS[lead.status]}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{lead.client_phone}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/leads/${id}/edit`}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
          >
            ✏️ עריכה
          </Link>
          <a
            href={`/api/quotes/${id}/pdf`}
            target="_blank"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            📄 הצעת מחיר PDF
          </a>
          <a
            href={`/api/quotes/${id}/docx`}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
          >
            📝 Word
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main details */}
        <div className="lg:col-span-2 space-y-5">
          {/* Event info */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">פרטי אירוע</h2>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-gray-500">תאריך</dt>
                <dd className="font-medium">{formatDate(lead.event_date)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">שעות</dt>
                <dd className="font-medium">{formatTime(lead.start_time)} – {formatTime(lead.end_time)}</dd>
              </div>
              <div>
                <dt className="text-gray-500">מיקום</dt>
                <dd className="font-medium">{lead.location?.city_name ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">משתתפים</dt>
                <dd className="font-medium">{lead.participants}</dd>
              </div>
              <div>
                <dt className="text-gray-500">סוג לקוח</dt>
                <dd className="font-medium">{CLIENT_TYPE_LABELS[lead.client_type]}</dd>
              </div>
              <div>
                <dt className="text-gray-500">סוג אירוע</dt>
                <dd className="font-medium">{EVENT_TYPE_LABELS[lead.event_type]}</dd>
              </div>
            </dl>
            {lead.notes && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <dt className="text-gray-500 text-sm mb-1">הערות</dt>
                <dd className="text-sm text-gray-700">{lead.notes}</dd>
              </div>
            )}
          </div>

          {/* Flavors */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">
              טעמים שנבחרו ({flavors.length})
            </h2>
            <div className="flex flex-wrap gap-2">
              {flavors.map((f: { id: string; name: string; category: string }) => (
                <span
                  key={f.id}
                  className={`px-3 py-1 rounded-full text-sm ${
                    f.category === 'dairy'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-green-100 text-green-800'
                  }`}
                >
                  {f.name}
                </span>
              ))}
              {flavors.length === 0 && (
                <span className="text-sm text-gray-400">לא נבחרו טעמים</span>
              )}
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h2 className="font-semibold text-gray-900 mb-3">תמחור</h2>
            <div className="space-y-2 text-sm">
              {pricing.vatAmount != null && (
                <div className="flex justify-between text-gray-600">
                  <span>לפני מע"מ</span>
                  <span>{formatNIS(pricing.totalPrice - pricing.vatAmount)}</span>
                </div>
              )}
              {pricing.vatAmount != null && (
                <div className="flex justify-between text-gray-600">
                  <span>מע"מ (18%)</span>
                  <span>{formatNIS(pricing.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>סה"כ</span>
                <span className="text-blue-700">{formatNIS(pricing.totalPrice)}</span>
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

          {/* Inventory */}
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
                <div className="text-xl font-bold text-blue-700">{inventory.basketasRequired}</div>
                <div className="text-xs text-gray-500">בסקטות</div>
              </div>
            </div>
            <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-sm text-amber-800">
              ⚠️ {OPERATIONAL_WARNING}
            </div>
          </div>

          {/* Signature status */}
          {lead.client_approved_at && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-sm text-green-800">
              ✅ הלקוח אישר את ההצעה — {lead.client_approved_name} ·{' '}
              {new Date(lead.client_approved_at).toLocaleString('he-IL')}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-5">
          <StatusChanger leadId={id} currentStatus={lead.status} />

          {role === 'admin' && (
            <ProfitabilityPanel
              totalCustomerPrice={pricing.totalPrice}
              logisticsCost={logisticsCost}
              managerIncluded={lead.manager_included}
              assistantsCount={lead.assistants_count}
              participants={lead.participants}
              basketaCostNis={basketaCost}
              profitWarningThreshold={profitThreshold}
            />
          )}

          {/* Signature link */}
          <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2 text-sm">חתימה דיגיטלית</h3>
            <p className="text-xs text-gray-500 mb-3">שלח ללקוח לאישור ההצעה:</p>
            <input
              readOnly
              value={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/approve/${lead.signature_token}`}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs bg-gray-50 text-gray-600"
              onClick={(e) => (e.target as HTMLInputElement).select()}
              dir="ltr"
            />
          </div>

          {lead.location && (
            <a
              href={`https://waze.com/ul?q=${encodeURIComponent(lead.location.city_name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700 hover:bg-blue-100"
            >
              🗺️ פתח ב-Waze — {lead.location.city_name}
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
