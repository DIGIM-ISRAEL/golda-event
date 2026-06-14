'use client'

import { useState } from 'react'
import { MessageCircle } from 'lucide-react'

interface WaMessage {
  title: string
  text: string
}

interface Props {
  waNumber: string
  messages: WaMessage[]
}

// כפתור וואטסאפ קומפקטי לכרטיס בלוח — פותח תפריט תבניות מוכנות מתחת לכרטיס.
// יושב מחוץ ל-<Link> של הכרטיס כדי לא לנווט / לא ליצור עיגון מקונן.
export default function LeadCardWa({ waNumber, messages }: Props) {
  const [open, setOpen] = useState(false)
  if (messages.length === 0) return null

  return (
    <div className="mt-1.5">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
        className="flex items-center justify-center gap-1.5 w-full rounded-lg border border-[#4F7A43]/40 bg-[#4F7A43]/5 py-1.5 text-xs font-semibold text-[#3D5A30] hover:bg-[#4F7A43]/10 transition-colors"
      >
        <MessageCircle size={13} />
        הודעת וואטסאפ
      </button>

      {open && (
        <div className="mt-1 grid grid-cols-1 gap-1">
          {messages.map((m) => (
            <a
              key={m.title}
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(m.text)}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              title={m.text}
              className="truncate rounded-lg border border-brand-line bg-white px-2.5 py-1.5 text-[11px] text-brand-ink hover:border-[#4F7A43] hover:bg-[#4F7A43]/5 transition-colors"
            >
              {m.title}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
