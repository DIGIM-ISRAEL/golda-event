'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageCircle } from 'lucide-react'

interface Props {
  leadId: string
  currentStatus: string
  sendQuoteHref: string
}

// "שלח הצעה בוואטסאפ" — פותח את וואטסאפ עם ההודעה המוכנה,
// ובמקביל מקדם את הליד ל"הצעה נשלחה" אוטומטית (רק שדרוג מ"ליד" — לעולם לא מוריד סטטוס).
export default function SendQuoteButton({ leadId, currentStatus, sendQuoteHref }: Props) {
  const router = useRouter()
  const [marking, setMarking] = useState(false)

  async function handleClick() {
    // פתיחת וואטסאפ מיד — בלי להמתין לשרת
    window.open(sendQuoteHref, '_blank', 'noopener,noreferrer')

    if (currentStatus === 'lead' && !marking) {
      setMarking(true)
      try {
        await fetch(`/api/leads/${leadId}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'quote_sent' }),
        })
        router.refresh()
      } catch {
        // לא קריטי — אפשר לעדכן ידנית; הוואטסאפ כבר נפתח
      } finally {
        setMarking(false)
      }
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="flex items-center justify-center gap-2 w-full bg-[#4F7A43] text-white rounded-xl py-3 text-sm font-semibold hover:bg-[#456B3A] transition-colors mb-3"
    >
      <MessageCircle size={16} />
      שלח הצעה בוואטסאפ
      {currentStatus === 'lead' && (
        <span className="text-[10px] font-normal text-white/75">(יעודכן ל&quot;הצעה נשלחה&quot;)</span>
      )}
    </button>
  )
}
