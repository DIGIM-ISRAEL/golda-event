import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { calculatePrice } from '@/lib/pricing'
import { calculateInventory } from '@/lib/inventory'
import {
  CLIENT_TYPE_LABELS,
  EVENT_TYPE_LABELS,
  OPERATIONAL_WARNING,
} from '@/lib/constants'
import { toWhatsAppNumber, formatDate } from '@/lib/utils'
import { formatNIS } from '@/lib/pricing'
import LeadDetailView from '@/components/leads/LeadDetailView'
import ProfitabilityPanel from '@/components/leads/ProfitabilityPanel'
import StatusChanger from '@/components/leads/StatusChanger'
import SignatureLink from '@/components/leads/SignatureLink'
import SendQuoteButton from '@/components/leads/SendQuoteButton'
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

  // הודעת וואטסאפ מוכנה — תקציר ההצעה + קישור לעמוד הצפייה/אישור/חתימה
  const approveUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/approve/${lead.signatureToken}`
  const quoteMessage = [
    `שלום ${lead.clientName}! 🍦`,
    `תודה על ההתעניינות בגולדה אירועים.`,
    ``,
    `הצעת המחיר לאירוע שלכם בתאריך ${formatDate(lead.eventDate)}${lead.location ? ` ב${lead.location.cityName}` : ''}:`,
    `💰 סה"כ: ${formatNIS(pricing.totalPrice)}`,
    ``,
    `לצפייה בהצעה המלאה ואישור דיגיטלי:`,
    approveUrl,
    ``,
    `נשמח לעמוד לרשותכם בכל שאלה!`,
  ].join('\n')
  const sendQuoteHref = `https://wa.me/${toWhatsAppNumber(lead.clientPhone)}?text=${encodeURIComponent(quoteMessage)}`

  return (
    <LeadDetailView
      id={id}
      clientName={lead.clientName}
      clientPhone={lead.clientPhone}
      status={lead.status}
      eventDate={lead.eventDate}
      startTime={lead.startTime}
      endTime={lead.endTime}
      cityName={lead.location?.cityName ?? null}
      participants={lead.participants}
      clientTypeLabel={CLIENT_TYPE_LABELS[lead.clientType]}
      eventTypeLabel={EVENT_TYPE_LABELS[lead.eventType]}
      notes={lead.notes}
      flavors={flavors.map((f) => ({ id: f.id, name: f.name, category: f.category }))}
      pricing={pricing}
      inventory={inventory}
      sameDayEvents={sameDayEvents.map((e) => ({
        id: e.id,
        startTime: e.startTime,
        endTime: e.endTime,
        clientName: e.clientName,
        cityName: e.location?.cityName ?? null,
      }))}
      operationalWarning={OPERATIONAL_WARNING}
      clientApproved={
        lead.clientApprovedAt
          ? { name: lead.clientApprovedName, at: lead.clientApprovedAt }
          : null
      }
      quoteViewedAt={lead.quoteViewedAt}
      pdfHref={`/api/quotes/${id}/pdf`}
      docxHref={`/api/quotes/${id}/docx`}
      editHref={`/leads/${id}/edit`}
      telHref={`tel:${lead.clientPhone}`}
      whatsappHref={`https://wa.me/${toWhatsAppNumber(lead.clientPhone)}`}
      wazeHref={
        lead.location
          ? `https://waze.com/ul?q=${encodeURIComponent(lead.location.cityName)}`
          : null
      }
      statusChanger={<StatusChanger leadId={id} currentStatus={lead.status} />}
      profitabilityPanel={
        session.role === 'admin' ? (
          <ProfitabilityPanel
            totalCustomerPrice={pricing.totalPrice}
            logisticsCost={logisticsCost}
            managerIncluded={lead.managerIncluded}
            assistantsCount={lead.assistantsCount}
            participants={lead.participants}
            basketaCostNis={basketaCost}
            profitWarningThreshold={profitThreshold}
          />
        ) : null
      }
      signatureLink={<SignatureLink url={approveUrl} />}
      sendQuoteButton={
        <SendQuoteButton leadId={id} currentStatus={lead.status} sendQuoteHref={sendQuoteHref} />
      }
      checklist={
        <EventChecklist
          leadId={id}
          initialCheckedItems={lead.checkedItems ?? []}
          basketasRequired={inventory.basketasRequired}
          flavors={flavors.map((f) => ({ name: f.name, category: f.category }))}
        />
      }
    />
  )
}
