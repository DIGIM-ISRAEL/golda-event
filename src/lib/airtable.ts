const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY!
const BASE_ID = 'app5pnaEc4UK3RUcP'
const TABLE_ID = 'tblABFOvI4cQSz3sg'

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
  const formula = encodeURIComponent(`{phone_my_user}="${phoneMyUser}"`)
  const data = await airtableFetch(`${TABLE_ID}?filterByFormula=${formula}&maxRecords=500`)
  return data.records ?? []
}

export async function getAllAirtableLeads(): Promise<AirtableLead[]> {
  const data = await airtableFetch(`${TABLE_ID}?maxRecords=500`)
  return data.records ?? []
}

export async function getAirtableLead(recordId: string): Promise<AirtableLead | null> {
  try {
    const data = await airtableFetch(`${TABLE_ID}/${recordId}`)
    return data
  } catch {
    return null
  }
}
