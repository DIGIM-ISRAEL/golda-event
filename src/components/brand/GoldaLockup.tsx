// לוקאפ הלוגו הרשמי של גולדה — החותם המלא (public/brand/tree-logo.png).
// נטען כתמונה אמיתית (PNG שקוף). size = גובה הלוגו בפיקסלים.
// badge עוטף ב"מטבע" קרם — לשימוש על רקעים כהים (סייד-בר).
import { cn } from '@/lib/utils'

interface Props {
  /** גובה הלוגו בפיקסלים */
  size?: number
  /** הצגת תגית לטינית מתחת ללוגו */
  tagline?: boolean
  /** עטיפת הלוגו ב"מטבע" קרם — לרקעים כהים */
  badge?: boolean
  className?: string
  /** @deprecated נשמר לתאימות לאחור (אינו בשימוש מאז המעבר ללוגו תמונה) */
  tone?: 'gold' | 'cream' | 'ink'
  /** @deprecated */
  palm?: boolean
}

export default function GoldaLockup({
  size = 120,
  tagline = false,
  badge = false,
  className,
}: Props) {
  const img = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/brand/tree-logo.png"
      alt="גולדה — גלידה ישראלית"
      height={size}
      style={{ height: size, width: 'auto' }}
      className="block select-none"
      draggable={false}
    />
  )

  return (
    <div className={cn('flex flex-col items-center', className)}>
      {badge ? (
        <span className="inline-flex rounded-2xl bg-brand-cream px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.16)]">
          {img}
        </span>
      ) : (
        img
      )}
      {tagline && (
        <span
          dir="ltr"
          className="font-display mt-3 text-brand-gold-deep text-center opacity-90"
          style={{ fontSize: Math.max(9, Math.round(size * 0.11)), letterSpacing: '0.22em' }}
        >
          BOUTIQUE ICE CREAM · EST. 2012
        </span>
      )}
    </div>
  )
}
