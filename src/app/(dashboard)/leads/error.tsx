'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function LeadsError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Leads error]', error)
  }, [error])

  return (
    <div className="p-8 max-w-lg mx-auto text-center" dir="rtl">
      <div className="text-4xl mb-4">⚠️</div>
      <h2 className="text-xl font-bold text-gray-900 mb-2">אירעה שגיאה בטעינת הדף</h2>
      <p className="text-sm text-gray-500 mb-1">{error.message || 'שגיאת שרת לא ידועה'}</p>
      {error.digest && (
        <p className="text-xs text-gray-400 mb-4 font-mono">{error.digest}</p>
      )}
      <div className="flex gap-3 justify-center mt-4">
        <button
          onClick={reset}
          className="px-4 py-2 bg-brand-maroon text-white rounded-lg text-sm font-medium hover:bg-brand-maroon-dark"
        >
          נסה שוב
        </button>
        <Link href="/leads" className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          חזרה ללידים
        </Link>
      </div>
    </div>
  )
}
