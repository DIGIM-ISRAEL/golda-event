// סמל הדקל של גולדה — דקל תמר אלגנטי בקו זהב
// יורש את הצבע מ-currentColor (השתמש ב-text-brand-gold וכו')

interface PalmLogoProps {
  size?: number
  className?: string
}

export default function PalmLogo({ size = 40, className }: PalmLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {/* גזע */}
      <path d="M32 30 C 31 40, 30 48, 28 58" strokeWidth={2.4} />
      <path d="M32 30 C 33 40, 34 48, 36 58" strokeWidth={2.4} />

      {/* עפאים (fronds) — מתפרשים מנקודת הכתר */}
      <path d="M32 30 C 24 24, 14 22, 5 24" />
      <path d="M32 30 C 26 21, 18 14, 9 12" />
      <path d="M32 30 C 31 19, 30 11, 30 4" />
      <path d="M32 30 C 33 19, 34 11, 34 4" />
      <path d="M32 30 C 38 21, 46 14, 55 12" />
      <path d="M32 30 C 40 24, 50 22, 59 24" />

      {/* תמרים בכתר */}
      <circle cx="32" cy="29" r="1.6" fill="currentColor" stroke="none" />
      <circle cx="28" cy="30.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="36" cy="30.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}
