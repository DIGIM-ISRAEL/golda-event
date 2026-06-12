import { Wallet } from 'lucide-react'
import { formatNIS } from '@/lib/pricing'

export interface DepositInfo {
  amount: number
  percent: number
  instructions: string
  link: string
}

// תיבת מקדמה — מוצגת ללקוח מיד אחרי החתימה (וגם בכניסה חוזרת להצעה חתומה).
// רכיב תצוגה טהור — משמש גם בעמוד השרת וגם בטופס הלקוח.
export default function DepositBox({ deposit }: { deposit: DepositInfo }) {
  return (
    <div className="mt-5 rounded-2xl border border-brand-gold/40 bg-[#FCF7EE] p-5">
      <div className="flex items-center gap-2 mb-2">
        <Wallet size={17} className="text-brand-gold-deep" />
        <h3 className="font-serif font-bold text-brand-ink">שריון סופי של התאריך — מקדמה</h3>
      </div>
      <p className="text-sm text-brand-ink/85 leading-relaxed mb-3">
        כדי לנעול את התאריך ביומן שלנו, נותר רק להסדיר מקדמה של{' '}
        <span className="font-bold text-brand-maroon" dir="ltr">
          {formatNIS(deposit.amount)}
        </span>{' '}
        ({deposit.percent}% מסכום ההזמנה).
      </p>
      {deposit.instructions && (
        <p className="text-sm text-brand-ink/80 leading-relaxed whitespace-pre-line mb-3">
          {deposit.instructions}
        </p>
      )}
      {deposit.link && (
        <a
          href={deposit.link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-maroon text-brand-cream px-5 py-3 text-sm font-semibold hover:bg-brand-maroon-dark transition-colors"
        >
          לתשלום המקדמה
        </a>
      )}
    </div>
  )
}
