import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'

const CALL_SERVER_URL = 'https://leads.digim.co.il/process-donation'
const AIRTABLE_BASE_ID = 'app5pnaEc4UK3RUcP'

function formatPhoneNumber(raw: string): string {
  const digits = raw.replace(/\D/g, '')
  if (digits.startsWith('972')) return digits
  if (digits.startsWith('0')) return '972' + digits.slice(1)
  return '972' + digits
}

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!session.phoneNumber) {
    return NextResponse.json({ error: 'לא הוגדר מספר טלפון לפרופיל שלך' }, { status: 400 })
  }

  const secret = process.env.CALL_SERVER_SECRET
  const airtableKey = process.env.AIRTABLE_API_KEY
  if (!secret || !airtableKey) {
    return NextResponse.json({ error: 'הגדרות שרת חסרות' }, { status: 500 })
  }

  const { recordId, phoneNumber, phoneFundraiser } = await request.json()
  if (!recordId || !phoneNumber) {
    return NextResponse.json({ error: 'חסרים שדות' }, { status: 400 })
  }

  const payload = {
    phoneNumber: formatPhoneNumber(phoneNumber),
    phoneMyUser: formatPhoneNumber(session.phoneNumber),
    phoneFundraiser: phoneFundraiser ? formatPhoneNumber(phoneFundraiser) : '',
    recordId,
    timestamp: new Date().toISOString(),
    source: 'airtable',
    originalNumbers: {
      phoneNumber: phoneNumber,
      phoneMyUser: session.phoneNumber,
    },
    airtableConfig: {
      apiKey: airtableKey,
      baseId: AIRTABLE_BASE_ID,
      tableId: 'tblcNkAMMCJQ3EVMl',
      uuidField: 'UUID',
      callStatusField: 'Sales Stage',
      callTimeField: 'call_time',
      callIdField: 'id_caller',
    },
  }

  try {
    const res = await fetch(CALL_SERVER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Secret-Key': secret,
      },
      body: JSON.stringify(payload),
    })

    let data: unknown
    const contentType = res.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      data = await res.json()
    } else {
      const text = await res.text()
      return NextResponse.json({ success: false, error: 'תשובה לא תקינה מהשרת: ' + text.slice(0, 200) })
    }

    if (!res.ok) {
      const err = (data as { error?: string }).error ?? `שגיאת שרת: ${res.status}`
      return NextResponse.json({ success: false, error: err })
    }

    return NextResponse.json({ success: true, callData: (data as { callData?: unknown }).callData ?? data })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'שגיאת רשת'
    return NextResponse.json({ success: false, error: message })
  }
}
