'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

export default function SignatureLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // אם ההעתקה נכשלה — המשתמש יכול לסמן ידנית
    }
  }

  return (
    <div className="flex items-stretch gap-2">
      <input
        readOnly
        value={url}
        dir="ltr"
        onClick={(e) => (e.target as HTMLInputElement).select()}
        className="flex-1 min-w-0 border border-brand-line rounded-xl px-3 py-2 text-xs bg-brand-cream/50 text-brand-muted outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 transition"
      />
      <button
        type="button"
        onClick={copy}
        className="shrink-0 inline-flex items-center gap-1.5 rounded-xl px-3 text-xs font-semibold bg-white border border-brand-gold/40 text-brand-gold-deep hover:border-brand-gold hover:bg-brand-cream/60 transition-colors"
      >
        {copied ? (
          <>
            <Check size={14} />
            הועתק
          </>
        ) : (
          <>
            <Copy size={14} />
            העתק
          </>
        )}
      </button>
    </div>
  )
}
