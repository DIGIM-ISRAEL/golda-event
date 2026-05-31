// סמל הדקל הרשמי של גולדה — קו זהב עדין, יורש צבע מ-currentColor.
// variant="crown" — כתר הדקל מתוך הלוגו הרשמי (golda_logo.svg), יושב מעל ה-wordmark.
// variant="tree"  — עץ דקל מלא עם גזע (palm_tree.svg), מתאים לסימן מים / קישוט גדול.
// עובי הקו נשמר ביחידות ה-viewBox (כמו בקבצים הרשמיים) כדי שהיחס העדין יישמר בכל גודל.

type Variant = 'crown' | 'tree'

interface PalmLogoProps {
  size?: number // רוחב בפיקסלים
  className?: string
  /** דריסת עובי הקו ביחידות ה-viewBox (ברירת מחדל = העובי הרשמי של הסמל) */
  strokeWidth?: number
  variant?: Variant
}

const VARIANTS: Record<
  Variant,
  { vb: string; ratio: number; stroke: number; paths: string[] }
> = {
  // כתר הדקל מהלוגו הרשמי — גזע קצר + 6 כפות שמתעקלות החוצה ונשמטות בקצוות.
  // viewBox צמוד לגבולות הסמל (x ±260, y -235..120) עם שוליים של חצי-קו.
  crown: {
    vb: '-269 -244 538 373',
    ratio: 373 / 538,
    stroke: 18,
    paths: [
      'M0 120 C0 70 0 35 0 0',
      'M0 0 C-110 25 -185 70 -260 125',
      'M0 0 C-80 -20 -145 -70 -205 -145',
      'M0 0 C-40 -90 -35 -155 -5 -235',
      'M0 0 C40 -90 35 -155 5 -235',
      'M0 0 C80 -20 145 -70 205 -145',
      'M0 0 C110 25 185 70 260 125',
    ],
  },
  // עץ דקל מלא — גזע ארוך + 8 כפות; מתאים לסימן מים גדול.
  tree: {
    vb: '0 0 2400 2600',
    ratio: 2600 / 2400,
    stroke: 34,
    paths: [
      'M1200 1000 C1180 1320 1185 1600 1200 2070',
      'M1200 1030 C900 1030 660 1160 420 1390',
      'M1200 1000 C925 860 760 650 610 390',
      'M1200 1000 C1080 730 1070 500 1130 210',
      'M1200 1000 C1320 730 1330 500 1270 210',
      'M1200 1000 C1475 860 1640 650 1790 390',
      'M1200 1030 C1500 1030 1740 1160 1980 1390',
      'M1200 1030 C1000 1120 810 1320 690 1620',
      'M1200 1030 C1400 1120 1590 1320 1710 1620',
    ],
  },
}

export default function PalmLogo({
  size = 40,
  className,
  strokeWidth,
  variant = 'crown',
}: PalmLogoProps) {
  const v = VARIANTS[variant]
  const height = Math.round(size * v.ratio)
  return (
    <svg
      width={size}
      height={height}
      viewBox={v.vb}
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth ?? v.stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {v.paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
