import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'

export async function POST(request: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cityName, travelCostNis } = await request.json()

  const location = await db.location.create({
    data: { cityName, travelCostNis: Number(travelCostNis) },
  })

  return NextResponse.json({
    id: location.id,
    city_name: location.cityName,
    travel_cost_nis: location.travelCostNis,
    created_at: location.createdAt,
  })
}
