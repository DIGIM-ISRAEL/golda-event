// פס הפסים האנכיים של גולדה — חתימה ויזואלית חוזרת (מתוך stripes.svg)
import { cn } from '@/lib/utils'

interface Props {
  height?: number
  className?: string
}

export default function StripeBar({ height = 6, className }: Props) {
  return (
    <div
      aria-hidden="true"
      className={cn('golda-stripes w-full', className)}
      style={{ height }}
    />
  )
}
