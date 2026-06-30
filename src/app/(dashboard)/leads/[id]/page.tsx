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
import { toWhatsAppNumber, formatDate, formatTime } from '@/lib/utils'
import { formatNIS } from '@/lib/pricing'
import LeadDetailView from '@/components/leads/LeadDetailView'
import ProfitabilityPanel from '@/components/leads/ProfitabilityPanel'
import StatusChanger from '@/components/leads/StatusChanger'
import SignatureLink from '@/components/leads/SignatureLink'
import SendQuoteButton from '@/components/leads/SendQuoteButton'
import WaQuickSend from '@/components/leads/WaQuickSend'
import EventChecklistSection from '@/components/leads/EventChecklistSection'
import { parseWaTemplates, fillWaTemplate } from '@/lib/wa-templates'
import { computeEventCost, parseSupplies, type EventLog } from '@/lib/event-cost'

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

  // פירוק עלות האירוע (כולל יצא/חזר) — לפאנל הרווחיות
  const supplies = parseSupplies(settingsMap['supply_costs'])
  const eventCost = computeEventCost({
    flavors: flavors.map((f) => ({ id: f.id, name: f.name, costPerBasketa: f.costPerBasketa })),
    participants: lead.participants,
    fallbackBasketaCost: basketaCost,
    eventLog: (lead.eventLog as EventLog | null) ?? null,
    supplies,
  })

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

  // תבניות הודעה מהירות לוואטסאפ — מהגדרות (או ברירת מחדל), ממולאות לפי הליד
  const waVars = {
    name: lead.clientName,
    dateLabel: formatDate(lead.eventDate),
    timeLabel: formatTime(lead.startTime),
    cityName: lead.location?.cityName ?? null,
    priceLabel: formatNIS(pricing.totalPrice),
    approveUrl,
  }
  const waMessages = parseWaTemplates(settingsMap['wa_templates']).map((t) => ({
    title: t.title,
    text: fillWaTemplate(t.body, waVars),
  }))

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
            flavorCosts={flavors.map((f) => f.costPerBasketa)}
            iceCreamNetCost={flavors.length > 0 ? eventCost.iceCreamNet : null}
            hasReturns={eventCost.hasReturns}
          />
        ) : null
      }
      signatureLink={<SignatureLink url={approveUrl} />}
      sendQuoteButton={
        <SendQuoteButton leadId={id} currentStatus={lead.status} sendQuoteHref={sendQuoteHref} />
      }
      waQuickSend={<WaQuickSend waNumber={toWhatsAppNumber(lead.clientPhone)} messages={waMessages} />}
      checklist={
        <EventChecklistSection
          leadId={id}
          role={session.role}
          status={lead.status}
          participants={lead.participants}
          flavors={flavors.map((f) => ({ id: f.id, name: f.name, costPerBasketa: f.costPerBasketa }))}
          flavorsForPrep={flavors.map((f) => ({ name: f.name, category: f.category }))}
          initialCheckedItems={lead.checkedItems ?? []}
          initialCustomItems={lead.customChecklistItems ?? []}
          initialEventLog={(lead.eventLog as EventLog | null) ?? null}
          fallbackBasketaCost={basketaCost}
          managerIncluded={lead.managerIncluded}
          assistantsCount={lead.assistantsCount}
          logisticsCost={logisticsCost}
          supplies={supplies}
          checklistUrl={`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/checklist/${lead.signatureToken}`}
        />
      }
    />
  )
}
