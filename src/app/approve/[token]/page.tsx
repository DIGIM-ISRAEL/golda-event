'use client'

import { useState, useRef, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle2, Eraser } from 'lucide-react'
import StripeBar from '@/components/brand/StripeBar'

export default function ApprovePage() {
  const params = useParams()
  const token = params.token as string

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
    } else {
      setDone(true)
    }
    setLoading(false)
  }

  if (done) {
    return (
      <div dir="rtl" className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-2xl border border-brand-line shadow-[0_1px_2px_rgba(94,42,51,0.04),0_24px_60px_-32px_rgba(94,42,51,0.4)] overflow-hidden text-center">
          <StripeBar height={6} />
          <div className="px-8 py-12">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/tree-logo.png" alt="גולדה" className="mx-auto h-20 w-auto mb-6" />
            <div className="mx-auto mb-4 grid place-items-center w-14 h-14 rounded-full bg-[#E7EDE4] text-[#4A6B41]">
              <CheckCircle2 size={30} />
            </div>
            <h1 className="font-serif text-2xl font-bold text-brand-ink mb-2">ההצעה אושרה בהצלחה!</h1>
            <p className="text-brand-ink/80">תודה {name} — קיבלנו את אישורך וחתימתך.</p>
            <p className="text-brand-muted text-sm mt-2">נציג שלנו יצור קשר בקרוב להמשך התיאום. 🍦</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" className="min-h-screen bg-brand-cream flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white rounded-2xl border border-brand-line shadow-[0_1px_2px_rgba(94,42,51,0.04),0_24px_60px_-32px_rgba(94,42,51,0.4)] overflow-hidden">
        <StripeBar height={6} />

        {/* כותרת מותגית */}
        <div className="text-center px-8 pt-9 pb-6 bg-gradient-to-b from-[#FCF7EE] to-white border-b border-brand-line">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/tree-logo.png" alt="גולדה — גלידה ישראלית" className="mx-auto h-24 w-auto" />
          <h1 className="font-serif text-2xl font-bold text-brand-ink mt-4">אישור הצעת מחיר</h1>
          <p className="text-sm text-brand-gold-deep mt-1.5 tracking-wide" style={{ fontFamily: "'EB Garamond', Georgia, serif" }}>
            גולדה · גלידה ישראלית
          </p>
        </div>

        <div className="px-8 py-7">
          <p className="text-sm text-brand-ink/80 leading-relaxed mb-6">
            שמחים להגיש לך את הצעת המחיר לאירוע. לאישור ההזמנה — מלא/י את שמך וחתום/חתמי דיגיטלית במסגרת למטה.
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
      </div>
    </div>
  )
}
