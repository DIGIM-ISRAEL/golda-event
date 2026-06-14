'use client'

import { useState } from 'react'
import { MessageCircle, ChevronDown } from 'lucide-react'

interface WaMessage {
  title: string
  text: string
}

interface Props {
  waNumber: string // מספר בפורמט בינלאומי (972...)
  messages: WaMessage[]
}

// הודעות וואטסאפ מהירות — כפתור לכל תבנית, פותח את וואטסאפ עם ההודעה מוכנה.
export default function WaQuickSend({ waNumber, messages }: Props) {
  const [open, setOpen] = useState(false)

  if (messages.length === 0) return null

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center justify-between w-full text-sm font-medium text-brand-ink/80 hover:text-brand-ink mb-2"
      >
        <span className="flex items-center gap-1.5">
          <MessageCircle size={14} className="text-[#4F7A43]" />
          הודעות מהירות בוואטסאפ
        </span>
        <ChevronDown size={16} className={`text-brand-muted transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="grid grid-cols-1 gap-1.5">
          {messages.map((m) => (
            <a
              key={m.title}
              href={`https://wa.me/${waNumber}?text=${encodeURIComponent(m.text)}`}
              target="_blank"
              rel="noopener noreferrer"
              title={m.text}
              className="flex items-center gap-2 rounded-xl border border-brand-line bg-white px-3 py-2 text-sm text-brand-ink hover:border-[#4F7A43] hover:bg-[#4F7A43]/5 transition-colors"
            >
              <MessageCircle size={14} className="text-[#4F7A43] shrink-0" />
              {m.title}
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
