// פרימיטיבים של ממשק בשפת המותג של גולדה — קרם/זהב, סריף אלגנטי, RTL, פסטלי
// כולם רכיבי שרת טהורים (ללא hooks) כדי שאפשר יהיה להשתמש בהם גם בעמודי שרת וגם בקליינט.
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { LEAD_STATUS_LABELS, LEAD_STATUS_COLORS } from '@/lib/constants'

/* ── כרטיס ───────────────────────────────────────────── */
export function Card({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'bg-white rounded-2xl border border-brand-line shadow-[0_1px_2px_rgba(93,42,49,0.04),0_12px_32px_-22px_rgba(93,42,49,0.22)]',
        className,
      )}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  action,
  className,
}: {
  title: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-between gap-3 px-5 py-3.5 border-b border-brand-line/70',
        className,
      )}
    >
      <h2 className="font-serif text-[15px] font-semibold text-brand-ink">{title}</h2>
      {action}
    </div>
  )
}

/* ── כותרת עמוד ──────────────────────────────────────── */
export function PageHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-end justify-between gap-4 mb-6', className)}>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span className="h-5 w-1.5 rounded-full bg-brand-gold/70 shrink-0" aria-hidden />
          <h1 className="font-serif text-2xl md:text-[28px] font-bold text-brand-ink leading-none truncate">
            {title}
          </h1>
        </div>
        {subtitle && <p className="text-sm text-brand-muted mt-2 pr-4">{subtitle}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}

/* ── כפתור ───────────────────────────────────────────── */
type ButtonVariant = 'primary' | 'secondary' | 'ghost'
const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-brand-maroon text-brand-cream hover:bg-brand-maroon-dark shadow-sm',
  secondary:
    'bg-white text-brand-gold-deep border border-brand-gold/40 hover:border-brand-gold hover:bg-brand-cream/60',
  ghost: 'text-brand-muted hover:text-brand-ink hover:bg-brand-cream/70',
}

const buttonBase =
  'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold tracking-wide transition-colors disabled:opacity-60 disabled:cursor-not-allowed'

export function Button({
  variant = 'primary',
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button className={cn(buttonBase, buttonVariants[variant], className)} {...props}>
      {children}
    </button>
  )
}

export function ButtonLink({
  variant = 'primary',
  className,
  children,
  href,
}: {
  variant?: ButtonVariant
  className?: string
  children: React.ReactNode
  href: string
}) {
  return (
    <Link href={href} className={cn(buttonBase, buttonVariants[variant], className)}>
      {children}
    </Link>
  )
}

/* ── תג סטטוס ────────────────────────────────────────── */
export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap',
        LEAD_STATUS_COLORS[status] ?? 'bg-brand-cream text-brand-muted',
        className,
      )}
    >
      {LEAD_STATUS_LABELS[status] ?? status}
    </span>
  )
}

/* ── כרטיס מונה ──────────────────────────────────────── */
export function StatCard({
  label,
  value,
  dotClass = 'bg-brand-gold',
  className,
}: {
  label: string
  value: React.ReactNode
  dotClass?: string
  className?: string
}) {
  return (
    <Card className={cn('p-4 md:p-5', className)}>
      <div className="flex items-center gap-2 mb-3">
        <span className={cn('h-2.5 w-2.5 rounded-full', dotClass)} aria-hidden />
        <span className="text-xs md:text-[13px] text-brand-muted">{label}</span>
      </div>
      <div className="font-serif text-3xl md:text-[34px] font-bold text-brand-ink leading-none">
        {value}
      </div>
    </Card>
  )
}
