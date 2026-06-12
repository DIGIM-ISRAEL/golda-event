'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Eraser } from 'lucide-react'
import DepositBox, { type DepositInfo } from '@/components/approve/DepositBox'

// טופס החתימה בעמוד האישור הציבורי — שם מלא + חתימה בקנבס.
// מוצג מתחת להצעת המחיר המלאה (רכיב שרת).
export default function ApprovalForm({ token, deposit }: { token: string; deposit?: DepositInfo | null }) {
  const router = useRouter()

  const [name, setName] = useState('')
  const [done, setDone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasSig, setHasSig] = useState(false)

  // התאמת רזולוציית הקנבס למסך (קווים חדים) — פעם אחת בטעינה
  useEffect(() => {
    const c = canvasRef.current
    if (!c) return
    const ratio = window.devicePixelRatio || 1
    const rect = c.getBoundingClientRect()
    c.width = Math.round(rect.width * ratio)
    c.height = Math.round(rect.height * ratio)
    const ctx = c.getContext('2d')
    if (ctx) {
      ctx.scale(ratio, ratio)
      ctx.strokeStyle = '#33262B'
      ctx.lineWidth = 2.4
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
    }
  }, [])

  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const c = canvasRef.current!
    const r = c.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function start(e: React.PointerEvent<HTMLCanvasElement>) {
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    drawing.current = true
    const { x, y } = point(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
    canvasRef.current?.setPointerCapture(e.pointerId)
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current) return
    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return
    const { x, y } = point(e)
    ctx.lineTo(x, y)
    ctx.stroke()
    if (!hasSig) setHasSig(true)
  }
  function end() {
    drawing.current = false
  }
  function clearSig() {
    const c = canvasRef.current
    const ctx = c?.getContext('2d')
    if (c && ctx) ctx.clearRect(0, 0, c.width, c.height)
    setHasSig(false)
  }

  async function approve() {
    if (!name.trim()) {
      setError('נא להזין שם מלא')
      return
    }
    if (!hasSig) {
      setError('נא לחתום במסגרת לפני האישור')
      return
    }
    setLoading(true)
    setError('')

    const signature = canvasRef.current?.toDataURL('image/png')
    const res = await fetch(`/api/approve/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), signature }),
    })

    if (!res.ok) {
      setError('שגיאה. ייתכן שהקישור אינו תקף.')
      setLoading(false)
      return
    }

    setDone(true)
    setLoading(false)
    // רענון רך — עמוד השרת יציג את מצב "אושר" גם בכניסה חוזרת
    router.refresh()
  }

  if (done) {
    return (
      <div className="py-6">
        <div className="text-center">
          <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-[#E7EDE4] text-[#4A6B41]">
            <CheckCircle2 size={30} />
          </div>
          <h2 className="font-serif text-xl font-bold text-brand-ink mb-1.5">ההצעה אושרה בהצלחה!</h2>
          <p className="text-brand-ink/80 text-sm">תודה {name} — קיבלנו את אישורך וחתימתך.</p>
          <p className="text-brand-muted text-sm mt-1.5">
            {deposit ? 'נשאר צעד אחד קטן לנעילת התאריך:' : 'נציג שלנו יצור קשר בקרוב להמשך התיאום. 🍦'}
          </p>
        </div>
        {deposit && <DepositBox deposit={deposit} />}
      </div>
    )
  }

  return (
    <div>
      <h2 className="font-serif text-lg font-bold text-brand-ink mb-1.5">אישור והזמנה</h2>
      <p className="text-sm text-brand-ink/75 leading-relaxed mb-5">
        לאישור ההזמנה — מלא/י את שמך המלא וחתום/חתמי דיגיטלית במסגרת למטה.
      </p>

      <label className="block text-sm font-medium text-brand-ink mb-1.5">שם מלא</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="השם המלא שלך"
        className="w-full rounded-xl border border-brand-line bg-brand-cream/50 px-4 py-3 text-sm text-brand-ink placeholder:text-brand-muted/50 focus:outline-none focus:border-brand-gold focus:ring-4 focus:ring-brand-gold/15 transition mb-5"
      />

      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-brand-ink">חתימה דיגיטלית</label>
        <button
          type="button"
          onClick={clearSig}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-gold-deep hover:text-brand-maroon transition-colors"
        >
          <Eraser size={13} />
          נקה
        </button>
      </div>
      <div className="relative rounded-xl border-[1.6px] border-dashed border-brand-gold/45 bg-[#FCFAF4] overflow-hidden">
        {!hasSig && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-brand-muted/60">
            חתמו כאן — באצבע או בעכבר
          </span>
        )}
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="block w-full h-[170px] touch-none cursor-crosshair"
        />
      </div>

      {error && (
        <div className="mt-4 rounded-xl bg-brand-peach/25 border border-brand-peach/60 text-brand-maroon px-4 py-3 text-sm">
          {error}
        </div>
      )}

      <button
        onClick={approve}
        disabled={loading}
        className="mt-6 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand-maroon text-brand-cream py-3.5 font-semibold text-sm tracking-wide hover:bg-brand-maroon-dark disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-sm"
      >
        <CheckCircle2 size={17} />
        {loading ? 'שולח…' : 'אני מאשר/ת את ההצעה וחותם/מת'}
      </button>

      <p className="text-[11px] text-brand-muted text-center mt-3 leading-relaxed">
        החתימה הדיגיטלית מהווה אישור מחייב להזמנה ולתנאי ההתקשרות.
      </p>
    </div>
  )
}
