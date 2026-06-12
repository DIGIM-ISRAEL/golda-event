'use client'

import { useState } from 'react'
import { RefreshCw } from 'lucide-react'

interface SyncSummary {
  catalogSize: number
  totalInDb: number
  renamed: string[]
  createdCount: number
  created: string[]
  updated: number
  deletedCount: number
  deleted: string[]
  archivedCount: number
  archived: string[]
}

// כפתור סנכרון קטלוג הטעמים — מיישר את המערכת מול רשימת הטעמים הרשמית
// (lib/flavor-catalog.ts, שמקורה באקסל חישוב העלויות).
export default function FlavorSyncButton() {
  const [running, setRunning] = useState(false)
  const [summary, setSummary] = useState<SyncSummary | null>(null)
  const [error, setError] = useState('')

  async function sync() {
    if (!confirm('לסנכרן את קטלוג הטעמים? טעמים שאינם ברשימה הרשמית יימחקו (או יסומנו "אזל" אם שובצו לאירועים).')) return
    setRunning(true)
    setError('')
    setSummary(null)
    try {
      const res = await fetch('/api/admin/sync-flavors', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'שגיאה בסנכרון')
        return
      }
      setSummary(data.summary)
    } catch {
      setError('שגיאת רשת')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="rounded-2xl border border-brand-line bg-white p-6 shadow-[0_1px_2px_rgba(94,42,51,0.04),0_12px_32px_-22px_rgba(94,42,51,0.22)]">
      <h2 className="font-semibold text-brand-ink">קטלוג טעמים</h2>
      <p className="text-xs text-brand-muted mt-1 mb-4">
        מיישר את רשימת הטעמים במערכת מול הרשימה הרשמית (מקובץ חישוב העלויות).
        מוסיף חדשים, מעדכן שמות וסדר, ומסיר מה שירד מהתפריט.
      </p>
      <button
        onClick={sync}
        disabled={running}
        className="inline-flex items-center gap-2 bg-brand-maroon text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-brand-maroon-dark disabled:opacity-60"
      >
        <RefreshCw size={15} className={running ? 'animate-spin' : ''} />
        {running ? 'מסנכרן…' : 'סנכרן קטלוג טעמים'}
      </button>

      {error && (
        <div className="mt-3 text-sm text-brand-maroon bg-brand-maroon/5 border border-brand-maroon/15 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-4 text-sm text-brand-ink/85 bg-[#EAF1E3] border border-[#C8DABA] rounded-xl p-4 space-y-1">
          <div className="font-semibold text-[#3D5A30]">✓ הסנכרון הושלם — {summary.totalInDb} טעמים בקטלוג</div>
          {summary.renamed.length > 0 && <div>שמות עודכנו: {summary.renamed.join(' · ')}</div>}
          {summary.createdCount > 0 && <div>נוספו {summary.createdCount}: {summary.created.join(' · ')}</div>}
          {summary.updated > 0 && <div>עודכנו (קטגוריה/סדר): {summary.updated}</div>}
          {summary.deletedCount > 0 && <div>נמחקו {summary.deletedCount}: {summary.deleted.join(' · ')}</div>}
          {summary.archivedCount > 0 && (
            <div>סומנו &quot;אזל&quot; (בשימוש באירועים קיימים): {summary.archived.join(' · ')}</div>
          )}
          {summary.renamed.length === 0 && summary.createdCount === 0 && summary.updated === 0 &&
            summary.deletedCount === 0 && summary.archivedCount === 0 && <div>הכל כבר מעודכן 👌</div>}
        </div>
      )}
    </div>
  )
}
