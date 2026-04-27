import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/session'
import { getAirtableLead } from '@/lib/airtable'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ recordId: string }> }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { recordId } = await params
  const lead = await getAirtableLead(recordId)
  if (!lead) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 })

  return NextResponse.json(lead)
}
