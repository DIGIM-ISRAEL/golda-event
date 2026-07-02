'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2 } from 'lucide-react'
import EventChecklist from '@/components/leads/EventChecklist'
import { ReturnsBlock } from '@/components/leads/EventReturns'
import { computeEventCost, type EventLog, type FlavorCostInfo } from '@/lib/event-cost'
import type { ChecklistSection } from '@/lib/checklist'

interface Props {
  token: string
  status: string
  participants: number
  flavors: FlavorCostInfo[]
  flavorsForPrep: { name: string; category: string }[]
  initialCheckedItems: string[]
  initialCustomItems: string[]
  initialEventLog: EventLog | null
  fallbackBasketaCost: number
  template: ChecklistSection[]
}

// תצוגת עובד דרך לינק ציבורי — צ'קליסט הכנה + החזרות במשקל. בלי מחירים.
export default function PublicEventChecklist(props: Props) {
  const { token, status, participants, flavors, fallbackBasketaCost } = props
  const url = `/api/checklist/${token}`

  const [eventLog, setEventLog] = useState<EventLog>(props.initialEventLog ?? {})
  const [finalizing, setFinalizing] = useState(false)
  const [finalized, setFinalized] = useState(false)
  const [, startTransition] = useTransition()

  const cost = computeEventCost({ flavors, participants, fallbackBasketaCost, eventLog })

  function setReturnedKg(flavorId: string, value: number) {
    const line = cost.flavorLines.find((l) => l.id === flavorId)
    const max = line ? line.outKg : 0
    const v = Math.max(0, Math.min(value, max))
    const next = { ...eventLog, returnedKg: { ...(eventLog.returnedKg ?? {}), [flavorId]: v } }
    setEventLog(next)
    startTransition(async () => {
      try {
        await fetch(url, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ eventLog: next }),
        })
      } catch {
        /* רך */
      }
    })
  }

  async function finalize() {
    if (!confirm('לסיים את האירוע ולשלוח דוח למנהל?')) return
    setFinalizing(true)
    try {
      // שולחים את היומן הנוכחי יחד עם הסיום — כדי שהחזרה שהוקלדה רגע לפני
      // לא תפסיד את המרוץ מול בקשת השמירה שבדרך
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventLog, finalize: true }),
      })
      if (!res.ok) throw new Error('finalize failed')
      setFinalized(true)
    } catch {
      alert('שליחת הדוח נכשלה — בדקו חיבור ונסו שוב, או פנו למנהל.')
    } finally {
      setFinalizing(false)
    }
  }

  if (finalized || status === 'done') {
    return (
      <div className="text-center py-8">
        <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-[#E7EDE4] text-[#4A6B41]">
          <CheckCircle2 size={30} />
        </div>
        <h2 className="font-serif text-xl font-bold text-brand-ink mb-1.5">האירוע סוכם, תודה!</h2>
        <p className="text-brand-ink/80 text-sm">הדוח נשלח למנהל. אפשר לסגור את החלון. 🍦</p>
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <EventChecklist
        leadId=""
        saveUrl={url}
        initialCheckedItems={props.initialCheckedItems}
        initialCustomItems={props.initialCustomItems}
        basketasRequired={cost.basketasRequired}
        flavors={props.flavorsForPrep}
        template={props.template}
        embedded
      />
      <ReturnsBlock lines={cost.flavorLines} status={status} showCosts={false} onReturnKg={setReturnedKg} />

      {/* סיום ושליחת דוח — רק כשהאירוע סגור (שריין תאריך); לפני כן אין מה לסכם */}
      {status === 'closed' && (
        <button
          onClick={finalize}
          disabled={finalizing}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-maroon text-brand-cream py-3 text-sm font-semibold hover:bg-brand-maroon-dark disabled:opacity-60 transition-colors mt-2"
        >
          <CheckCircle2 size={17} />
          {finalizing ? 'מסכם…' : 'סיימתי — שמור ושלח למנהל'}
        </button>
      )}
    </div>
  )
}
