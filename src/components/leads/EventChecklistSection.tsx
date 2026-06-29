'use client'

import { useState, useTransition } from 'react'
import { Minus, Plus, IceCreamCone, Wallet, PackageOpen, ClipboardList, Undo2 } from 'lucide-react'
import EventChecklist from '@/components/leads/EventChecklist'
import { computeEventCost, type EventLog, type FlavorCostInfo } from '@/lib/event-cost'
import { formatNIS } from '@/lib/pricing'
import { MANAGER_COST, ASSISTANT_COST, type SupplyItem } from '@/lib/constants'
import { cn } from '@/lib/utils'

interface Props {
  leadId: string
  role: 'admin' | 'sales'
  status: string
  participants: number
  flavors: FlavorCostInfo[]
  flavorsForPrep: { name: string; category: string }[]
  initialCheckedItems: string[]
  initialEventLog: EventLog | null
  fallbackBasketaCost: number
  managerIncluded: boolean
  assistantsCount: number
  logisticsCost: number
  supplies: SupplyItem[]
}

export default function EventChecklistSection(props: Props) {
  const { leadId, role, status, participants, flavors, fallbackBasketaCost, supplies } = props
  const isAdmin = role === 'admin'

  const [tab, setTab] = useState<'worker' | 'manager'>('worker')
  const [eventLog, setEventLog] = useState<EventLog>(props.initialEventLog ?? {})
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
          {/* צ'קליסט ההכנה הקיים */}
          <EventChecklist
            leadId={leadId}
            initialCheckedItems={props.initialCheckedItems}
            basketasRequired={cost.basketasRequired}
            flavors={props.flavorsForPrep}
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

/* ── סטפר +/− ─────────────────────────────── */
function Stepper({
  value,
  onChange,
  max,
}: {
  value: number
  onChange: (v: number) => void
  max: number
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button
        onClick={() => onChange(value - 1)}
        disabled={value <= 0}
        className="grid place-items-center w-8 h-8 rounded-lg border border-brand-line bg-white text-brand-ink disabled:opacity-30 hover:bg-brand-cream/60"
        aria-label="הפחת"
      >
        <Minus size={15} />
      </button>
      <span className="w-7 text-center font-serif text-lg font-bold text-brand-ink tabular-nums">{value}</span>
      <button
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        className="grid place-items-center w-8 h-8 rounded-lg border border-brand-line bg-white text-brand-ink disabled:opacity-30 hover:bg-brand-cream/60"
        aria-label="הוסף"
      >
        <Plus size={15} />
      </button>
    </div>
  )
}

/* ── שדה משקל (ק"ג) ─────────────────────────────── */
function KgInput({
  value,
  max,
  onChange,
}: {
  value: number
  max: number
  onChange: (v: number) => void
}) {
  return (
    <div className="flex items-center gap-1 shrink-0">
      <input
        type="number"
        inputMode="decimal"
        step="0.1"
        min={0}
        max={max}
        value={value || ''}
        placeholder="0"
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-16 text-center font-serif text-base font-bold text-brand-ink tabular-nums border border-brand-line bg-white rounded-lg px-2 py-1.5 focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 focus:outline-none"
        dir="ltr"
      />
      <span className="text-xs text-brand-muted">ק&quot;ג</span>
    </div>
  )
}

/* ── בלוק החזרות (משותף, עם/בלי מחירים) — לפי משקל ─────────────────────────────── */
function ReturnsBlock({
  lines,
  status,
  showCosts,
  onReturnKg,
}: {
  lines: ReturnType<typeof computeEventCost>['flavorLines']
  status: string
  showCosts: boolean
  onReturnKg: (flavorId: string, value: number) => void
}) {
  const isDone = status === 'closed' || status === 'done'
  const [open, setOpen] = useState(isDone)
  const totalReturnedKg = lines.reduce((s, l) => s + l.returnedKg, 0)

  if (lines.length === 0) return null

  return (
    <div className="m-2 rounded-xl border border-brand-gold/30 bg-[#FCF7EE] overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-right"
      >
        <span className="flex items-center gap-2 font-semibold text-brand-ink text-sm">
          <Undo2 size={15} className="text-brand-gold-deep" />
          חזרה מאירוע — משקל שחזר לכל טעם
        </span>
        <span className="text-xs text-brand-muted">
          {totalReturnedKg > 0 ? `${totalReturnedKg.toFixed(1)} ק"ג חזרו` : open ? 'סגור' : 'פתח'}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-1">
          <p className="text-xs text-brand-muted mb-3 leading-relaxed">
            שִקלו את מה שחזר והזינו <b>ק&quot;ג לכל טעם</b>. בסקטה מלאה = 4.5 ק&quot;ג. הזיכוי מחושב יחסית למשקל.
          </p>
          <div className="space-y-1.5">
            {lines.map((l) => (
              <div key={l.id} className="flex items-center justify-between gap-2 py-1">
                <div className="min-w-0">
                  <div className="text-sm text-brand-ink truncate">{l.name}</div>
                  <div className="text-[11px] text-brand-muted">
                    יצא {l.outKg.toFixed(1)} ק&quot;ג
                    {showCosts && l.returnedKg > 0 && (
                      <span className="text-[#3D5A30] font-medium"> · זיכוי {formatNIS(l.returnCredit)}</span>
                    )}
                  </div>
                </div>
                <KgInput value={l.returnedKg} max={l.outKg} onChange={(v) => onReturnKg(l.id, v)} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
  cost: ReturnType<typeof computeEventCost>
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
