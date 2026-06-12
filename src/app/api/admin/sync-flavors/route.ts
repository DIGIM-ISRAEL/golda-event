import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getSession } from '@/lib/session'
import { FLAVOR_CATALOG, FLAVOR_RENAMES } from '@/lib/flavor-catalog'

// סנכרון קטלוג הטעמים מול מקור האמת (lib/flavor-catalog.ts, מתוך אקסל העלויות):
//  - שינויי שם נשמרים עם ההיסטוריה (אותה שורה, שם חדש)
//  - טעמים חדשים נוספים; קיימים מקבלים קטגוריה וסדר תצוגה עדכניים
//  - טעמים שאינם בקטלוג: נמחקים, או מסומנים "אזל" אם כבר שובצו לאירועים
// מורשה: אדמין מחובר, או Bearer CRON_SECRET (להרצה תפעולית).
export async function POST(request: NextRequest) {
  const session = await getSession()
  const isAdmin = session?.role === 'admin'
  const authHeader = request.headers.get('authorization')
  const secretOk =
    !!process.env.CRON_SECRET && authHeader === `Bearer ${process.env.CRON_SECRET}`

  if (!isAdmin && !secretOk) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const renamed: string[] = []
  const created: string[] = []
  const deleted: string[] = []
  const archived: string[] = []
  let updated = 0

  // 1. שינויי שם — רק אם הישן קיים והחדש עוד לא
  for (const [oldName, newName] of Object.entries(FLAVOR_RENAMES)) {
    const oldFlavor = await db.flavor.findFirst({ where: { name: oldName } })
    const newExists = await db.flavor.findFirst({ where: { name: newName } })
    if (oldFlavor && !newExists) {
      await db.flavor.update({ where: { id: oldFlavor.id }, data: { name: newName } })
      renamed.push(`${oldName} ← ${newName}`)
    }
  }

  // 2. עדכון/הוספה לפי הקטלוג
  const catalogNames = new Set(FLAVOR_CATALOG.map((f) => f.name))
  const seenIds = new Set<string>()

  for (let i = 0; i < FLAVOR_CATALOG.length; i++) {
    const entry = FLAVOR_CATALOG[i]
    const existing = await db.flavor.findFirst({
      where: { name: entry.name, id: { notIn: Array.from(seenIds) } },
      orderBy: { createdAt: 'asc' },
    })
    if (existing) {
      seenIds.add(existing.id)
      if (existing.category !== entry.category || existing.sortOrder !== i) {
        await db.flavor.update({
          where: { id: existing.id },
          data: { category: entry.category, sortOrder: i },
        })
        updated++
      }
    } else {
      const f = await db.flavor.create({
        data: { name: entry.name, category: entry.category, sortOrder: i, isInStock: true },
      })
      seenIds.add(f.id)
      created.push(entry.name)
    }
  }

  // 3. כל מה שלא בקטלוג (כולל כפילויות) — מחיקה, או "אזל" אם בשימוש באירועים
  const extras = await db.flavor.findMany({
    where: { id: { notIn: Array.from(seenIds) } },
    include: { _count: { select: { leadFlavors: true } } },
  })

  for (const extra of extras) {
    if (extra._count.leadFlavors === 0) {
      await db.flavor.delete({ where: { id: extra.id } })
      deleted.push(extra.name)
    } else if (extra.isInStock) {
      // משובץ באירועים קיימים — לא מוחקים היסטוריה, רק מורידים מהקטלוג הפעיל
      await db.flavor.update({ where: { id: extra.id }, data: { isInStock: false } })
      archived.push(extra.name)
    } else {
      archived.push(extra.name)
    }
  }

  const total = await db.flavor.count()

  return NextResponse.json({
    ok: true,
    summary: {
      catalogSize: FLAVOR_CATALOG.length,
      totalInDb: total,
      renamed,
      createdCount: created.length,
      created,
      updated,
      deletedCount: deleted.length,
      deleted,
      archivedCount: archived.length,
      archived,
    },
    note: catalogNames.size !== FLAVOR_CATALOG.length ? 'אזהרה: שמות כפולים בקטלוג' : undefined,
  })
}
