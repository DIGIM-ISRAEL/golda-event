const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = 'app5pnaEc4UK3RUcP'
const TABLE_ID = 'tblABFOvI4cQSz3sg'

// Only leads created in the last 7 days
const DATE_FILTER = `IS_AFTER(CREATED_TIME(), DATEADD(TODAY(), -7, 'days'))`

export interface AirtableLead {
  id: string
  fields: {
    phone_number?: string
    phone_my_user?: string
    phone_fundraiser?: string
    'Lead Quality Score'?: number
    'Call Summary'?: string
    [key: string]: unknown
  }
}

async function airtableFetch(path: string) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${path}`, {
    headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
    cache: 'no-store',
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Airtable error ${res.status}: ${text}`)
  }
  return res.json()
}

export async function getAirtableLeads(phoneMyUser: string): Promise<AirtableLead[]> {
  const formula = `AND({phone_my_user}="${phoneMyUser}", ${DATE_FILTER})`
  const data = await airtableFetch(`${TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=200`)
  return data.records ?? []
}

export async function getAirtableLeadsByPhones(phones: string[]): Promise<AirtableLead[]> {
  if (phones.length === 0) return []
  const phoneFilter =
    phones.length === 1
      ? `{phone_my_user}="${phones[0]}"`
      : `OR(${phones.map((p) => `{phone_my_user}="${p}"`).join(',')})`
  const formula = `AND(${phoneFilter}, ${DATE_FILTER})`
  const data = await airtableFetch(`${TABLE_ID}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=200`)
  return data.records ?? []
}

export async function syncAirtableLeadsToDb(
  phones: string[],
  db: import('@prisma/client').PrismaClient,
): Promise<void> {
  if (phones.length === 0) return
  const leads = await getAirtableLeadsByPhones(phones)
  const today = new Date().toISOString().split('T')[0]

  for (const lead of leads) {
    const f = lead.fields
    const name = String(f['שם מלא'] || f.phone_number || 'ליד ממתין')
    const phone = String(f.phone_number || '')

    await db.lead.upsert({
      where: { airtableRecordId: lead.id },
      create: {
        airtableRecordId: lead.id,
        clientName: name,
        clientPhone: phone,
        clientType: 'institutional',
        eventType: 'dairy',
        eventDate: today,
        startTime: '18:00',
        endTime: '20:00',
        participants: 100,
        status: 'lead',
        notes: f['Call Summary'] ? String(f['Call Summary']) : null,
      },
      update: {},
    })
  }
}

export async function getAirtableLead(recordId: string): Promise<AirtableLead | null> {
  try {
    const data = await airtableFetch(`${TABLE_ID}/${recordId}`)
    return data
  } catch {
    return null
  }
}
