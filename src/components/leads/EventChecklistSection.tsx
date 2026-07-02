'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { IceCreamCone, Wallet, PackageOpen, ClipboardList, Pencil, Send, CheckCircle2 } from 'lucide-react'
import EventChecklist from '@/components/leads/EventChecklist'
import { Stepper, ReturnsBlock } from '@/components/leads/EventReturns'
import SignatureLink from '@/components/leads/SignatureLink'
import { computeEventCost, type EventCostResult, type EventLog, type FlavorCostInfo } from '@/lib/event-cost'
import { formatNIS } from '@/lib/pricing'
import { MANAGER_COST, ASSISTANT_COST, type SupplyItem } from '@/lib/constants'
import type { ChecklistSection } from '@/lib/checklist'
import { cn } from '@/lib/utils'

interface Props {
  leadId: string
  role: 'admin' | 'sales'
  status: string
  participants: number
  flavors: FlavorCostInfo[]
  flavorsForPrep: { name: string; category: string }[]
  initialCheckedItems: string[]
  initialCustomItems: string[]
  initialEventLog: EventLog | null
  fallbackBasketaCost: number
  managerIncluded: boolean
  assistantsCount: number
  logisticsCost: number
  supplies: SupplyItem[]
  template: ChecklistSection[]
  checklistUrl: string // לינק ציבורי לעובד
}

export default function EventChecklistSection(props: Props) {
  const { leadId, role, status, participants, flavors, fallbackBasketaCost, supplies } = props
  const isAdmin = role === 'admin'
  const router = useRouter()

  const [tab, setTab] = useState<'worker' | 'manager'>('worker')
  const [eventLog, setEventLog] = useState<EventLog>(props.initialEventLog ?? {})
  const [finalizing, setFinalizing] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [, startTransition] = useTransition()

  const cost = computeEventCost({ flavors, participants, fallbackBasketaCost, eventLog, supplies })

  function save(next: EventLog) {
    setEventLog(next)
    startTransition(async () => {
      try {
        await fetch(`/api/leads/${leadId}/checklist`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventLog: next }),
        })
      } catch {
        /* שמירה רכה — לא מפילה את הממשק */
      }
    })
  }

  async function finalize() {
    if (!confirm('לסיים את האירוע ולשלוח דוח עלויות לבדיקה? הליד יעבור ל"בוצע".')) return
    setFinalizing(true)
    try {
      // היומן הנוכחי נשלח יחד עם הסיום — מנצח כל שמירה שעדיין בדרך
      const res = await fetch(`/api/leads/${leadId}/checklist`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventLog, finalize: true }),
      })
      if (!res.ok) throw new Error('finalize failed')
      setFinalized(true)
      router.refresh()
    } catch {
      alert('שליחת הדוח נכשלה — נסה שוב.')
    } finally {
      setFinalizing(false)
    }
  }

  function setReturnedKg(flavorId: string, value: number) {
    const line = cost.flavorLines.find((l) => l.id === flavorId)
    const max = line ? line.outKg : 0
    const v = Math.max(0, Math.min(value, max))
    save({ ...eventLog, returnedKg: { ...(eventLog.returnedKg ?? {}), [flavorId]: v } })
  }

  function setOut(flavorId: string, value: number) {
    const v = Math.max(0, Math.min(value, cost.basketasRequired))
    save({ ...eventLog, basketasOut: { ...(eventLog.basketasOut ?? {}), [flavorId]: v } })
  }

  return (
    <div className="bg-white rounded-2xl border border-brand-line shadow-[0_1px_2px_rgba(93,42,49,0.04),0_12px_32px_-22px_rgba(93,42,49,0.22)] overflow-hidden">
      {/* כפתורי מעבר */}
      <div className="flex gap-1 p-1.5 bg-brand-cream/50 border-b border-brand-line">
        <TabButton active={tab === 'worker'} onClick={() => setTab('worker')} icon={<ClipboardList size={15} />}>
          צ&apos;קליסט עובד
        </TabButton>
        {isAdmin && (
          <TabButton active={tab === 'manager'} onClick={() => setTab('manager')} icon={<Wallet size={15} />}>
            צ&apos;קליסט מנהל
          </TabButton>
        )}
      </div>

      {tab === 'worker' ? (
        <div className="p-1">
          {/* צ'קליסט ההכנה — כולל פריטים אד-הוק */}
          <EventChecklist
            leadId={leadId}
            initialCheckedItems={props.initialCheckedItems}
            initialCustomItems={props.initialCustomItems}
            basketasRequired={cost.basketasRequired}
            flavors={props.flavorsForPrep}
            template={props.template}
            embedded
          />
          {/* רישום החזרות — בלי מחירים */}
          <ReturnsBlock
            lines={cost.flavorLines}
            status={status}
            showCosts={false}
            onReturnKg={setReturnedKg}
          />
        </div>
      ) : (
        <ManagerView
          cost={cost}
          participants={participants}
          managerCost={props.managerIncluded ? MANAGER_COST : 0}
          assistantsCost={props.assistantsCount * ASSISTANT_COST}
          logisticsCost={props.logisticsCost}
          status={status}
          onOut={setOut}
          onReturnKg={setReturnedKg}
        />
      )}

      {/* פעולות אירוע — עריכה, לינק לעובד, וסיום */}
      <div className="border-t border-brand-line p-4 space-y-3 bg-brand-cream/30">
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/leads/${leadId}/edit`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white border border-brand-gold/40 text-brand-gold-deep px-3.5 py-2 text-sm font-semibold hover:bg-brand-cream/60 transition-colors"
          >
            <Pencil size={15} />
            ערוך אירוע / טעמים
          </Link>
        </div>

        <div>
          <div className="flex items-center gap-1.5 text-xs text-brand-muted mb-1.5">
            <Send size={13} className="text-[#4F7A43]" />
            לינק צ&apos;קליסט לעובד (ממלא בשטח, בלי מחירים):
          </div>
          <SignatureLink url={props.checklistUrl} />
        </div>

        {finalized || status === 'done' ? (
          <div className="flex items-center justify-center gap-2 rounded-xl bg-[#EAF1E3] border border-[#C8DABA] py-3 text-sm font-semibold text-[#3D5A30]">
            <CheckCircle2 size={17} />
            האירוע סוכם ודוח עלויות נשלח
          </div>
        ) : status === 'closed' ? (
          <button
            onClick={finalize}
            disabled={finalizing}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-maroon text-brand-cream py-3 text-sm font-semibold hover:bg-brand-maroon-dark disabled:opacity-60 transition-colors"
          >
            <CheckCircle2 size={17} />
            {finalizing ? 'מסכם…' : 'סיימתי — שלח דוח עלויות'}
          </button>
        ) : (
          <div className="text-center text-xs text-brand-muted/80 py-1.5">
            סיכום ודוח עלויות יהיו זמינים כשהאירוע יעבור לסטטוס &quot;סגור / שמור&quot;
          </div>
        )}
      </div>
    </div>
  )
}

/* ── כפתור טאב ─────────────────────────────── */
function TabButton({
  active,
  onClick,
  icon,
  children,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-semibold transition-colors',
        active ? 'bg-white text-brand-maroon shadow-sm' : 'text-brand-muted hover:text-brand-ink',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

/* ── תצוגת מנהל — עלויות + סיכום ─────────────────────────────── */
function ManagerView({
  cost,
  participants,
  managerCost,
  assistantsCost,
  logisticsCost,
  status,
  onOut,
  onReturnKg,
}: {
  cost: EventCostResult
  participants: number
  managerCost: number
  assistantsCost: number
  logisticsCost: number
  status: string
  onOut: (flavorId: string, value: number) => void
  onReturnKg: (flavorId: string, value: number) => void
}) {
  const grandTotal = cost.goodsCost + managerCost + assistantsCost + logisticsCost

  return (
    <div className="p-4 space-y-4">
      {/* בסקטות — עלות + כמה יצא */}
      <div>
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-ink mb-2">
          <IceCreamCone size={15} className="text-brand-gold" />
          גלידה — כמה יצא מכל טעם
        </h3>
        <div className="space-y-1.5">
          {cost.flavorLines.map((l) => (
            <div key={l.id} className="flex items-center justify-between gap-2 py-1">
              <div className="min-w-0">
                <div className="text-sm text-brand-ink truncate">{l.name}</div>
                <div className="text-[11px] text-brand-muted">
                  {formatNIS(l.unitCost)} לבסקטה{l.estimated && ' (משוער)'}
                  {l.returnedKg > 0 && <span className="text-[#3D5A30]"> · חזרו {l.returnedKg.toFixed(1)} ק&quot;ג</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium text-brand-ink w-16 text-left tabular-nums" dir="ltr">
                  {formatNIS(l.netCost)}
                </span>
                <Stepper value={l.out} max={cost.basketasRequired} onChange={(v) => onOut(l.id, v)} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* כלים */}
      <div className="border-t border-brand-line/70 pt-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-brand-ink mb-2">
          <PackageOpen size={15} className="text-brand-gold" />
          כלי הגשה ({participants} משתתפים)
        </h3>
        <div className="space-y-1">
          {cost.utensilLines.map((u) => (
            <div key={u.label} className="flex items-center justify-between text-sm">
              <span className="text-brand-muted">
                {u.label} × {u.qty}
              </span>
              <span className="text-brand-ink/80" dir="ltr">
                {formatNIS(u.cost)}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* רישום החזרות — עם מחירים */}
      <ReturnsBlock lines={cost.flavorLines} status={status} showCosts onReturnKg={onReturnKg} />

      {/* סיכום */}
      <div className="rounded-xl bg-[#EAF1E3] border border-[#C8DABA] p-4 space-y-2 text-sm">
        <div className="flex justify-between text-brand-muted">
          <span>גלידה שיצאה</span>
          <span dir="ltr">{formatNIS(cost.iceCreamOut)}</span>
        </div>
        {cost.iceCreamReturn > 0 && (
          <div className="flex justify-between text-[#3D5A30] font-medium">
            <span>זיכוי החזרות</span>
            <span dir="ltr">−{formatNIS(cost.iceCreamReturn)}</span>
          </div>
        )}
        <div className="flex justify-between text-brand-ink">
          <span>גלידה נטו (נצרך)</span>
          <span dir="ltr" className="font-medium">{formatNIS(cost.iceCreamNet)}</span>
        </div>
        <div className="flex justify-between text-brand-muted">
          <span>כלי הגשה</span>
          <span dir="ltr">{formatNIS(cost.utensilsCost)}</span>
        </div>
        {managerCost > 0 && (
          <div className="flex justify-between text-brand-muted">
            <span>מנהל אירוע</span>
            <span dir="ltr">{formatNIS(managerCost)}</span>
          </div>
        )}
        {assistantsCost > 0 && (
          <div className="flex justify-between text-brand-muted">
            <span>עוזרים</span>
            <span dir="ltr">{formatNIS(assistantsCost)}</span>
          </div>
        )}
        {logisticsCost > 0 && (
          <div className="flex justify-between text-brand-muted">
            <span>לוגיסטיקה</span>
            <span dir="ltr">{formatNIS(logisticsCost)}</span>
          </div>
        )}
        <div className="flex justify-between items-baseline border-t border-[#C8DABA] pt-2 font-bold">
          <span className="text-brand-ink">סה&quot;כ עלות האירוע</span>
          <span dir="ltr" className="font-serif text-lg text-brand-maroon">{formatNIS(grandTotal)}</span>
        </div>
        {cost.iceCreamReturn > 0 && (
          <div className="text-[11px] text-[#3D5A30] text-center pt-1">
            חסכת {formatNIS(cost.iceCreamReturn)} כי חזרו בסקטות שלמות 🎉
          </div>
        )}
      </div>
    </div>
  )
}
