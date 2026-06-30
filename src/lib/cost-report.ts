import { db } from '@/lib/db'
import { sendEmail } from '@/lib/email'
import { computeEventCost, parseSupplies } from '@/lib/event-cost'
import { formatNIS } from '@/lib/pricing'
import { formatDate, formatTime } from '@/lib/utils'
import { MANAGER_COST, ASSISTANT_COST } from '@/lib/constants'

// סוגר אירוע: מעביר מ"סגור" ל"בוצע" (אם רלוונטי), מחשב דוח עלויות מלא,
// ושולח אותו במייל לאדמין ולנציג לבדיקה/אישור/תיקון.
// קריא גם מהאפליקציה (מחובר) וגם מהלינק הציבורי (טוקן).
export async function finalizeEventAndReport(leadId: string): Promise<{ ok: boolean; movedToDone: boolean }> {
  const [lead, settingsRows] = await Promise.all([
    db.lead.findUnique({
      where: { id: leadId },
      include: { location: true, salesRep: true, flavors: { include: { flavor: true } } },
    }),
    db.settings.findMany().catch(() => [] as { key: string; value: string }[]),
  ])
  if (!lead) return { ok: false, movedToDone: false }

  const settingsMap = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]))
  const basketaCost = Number(settingsMap['basketa_cost_nis'] ?? 150)
  const supplies = parseSupplies(settingsMap['supply_costs'])

  const cost = computeEventCost({
    flavors: lead.flavors.map((lf) => ({
      id: lf.flavor.id,
      name: lf.flavor.name,
      costPerBasketa: lf.flavor.costPerBasketa,
    })),
    participants: lead.participants,
    fallbackBasketaCost: basketaCost,
    eventLog: (lead.eventLog as Parameters<typeof computeEventCost>[0]['eventLog']) ?? null,
    supplies,
  })

  // מעבר אוטומטי סגור → בוצע (בלי לגעת ביומן גוגל — האירוע כבר התקיים)
  const movedToDone = lead.status === 'closed'
  await db.lead.update({
    where: { id: leadId },
    data: {
      ...(movedToDone ? { status: 'done' as const } : {}),
      costReportSentAt: new Date(),
    },
  })

  // שליחת הדוח במייל
  try {
    const recipients = new Set<string>()
    if (process.env.ADMIN_EMAIL) recipients.add(process.env.ADMIN_EMAIL)
    if (lead.salesRep?.email) recipients.add(lead.salesRep.email)
    if (recipients.size > 0) {
      const managerCost = lead.managerIncluded ? MANAGER_COST : 0
      const assistantsCost = lead.assistantsCount * ASSISTANT_COST
      const logisticsCost = lead.location?.travelCostNis ?? 0
      const grandTotal = cost.goodsCost + managerCost + assistantsCost + logisticsCost
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

      const flavorRows = cost.flavorLines
        .map(
          (l) => `
          <tr>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;">${l.name}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center;">${l.outKg.toFixed(1)}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:center;color:#3D5A30;">${l.returnedKg > 0 ? l.returnedKg.toFixed(1) : '—'}</td>
            <td style="padding:5px 8px;border-bottom:1px solid #eee;text-align:left;font-weight:bold;">${formatNIS(l.netCost)}</td>
          </tr>`,
        )
        .join('')

      const costLine = (label: string, val: number) =>
        `<tr><td style="padding:3px 8px;color:#666;">${label}</td><td style="padding:3px 8px;text-align:left;">${formatNIS(val)}</td></tr>`

      await sendEmail({
        to: Array.from(recipients),
        subject: `📋 דוח עלויות אירוע — ${lead.clientName}`,
        html: `
          <div dir="rtl" style="font-family:Arial,sans-serif;padding:20px;text-align:right;max-width:600px;">
            <h2 style="margin:0 0 4px;">דוח עלויות לבדיקה ואישור</h2>
            <p style="color:#666;margin:0 0 16px;font-size:14px;">
              ${lead.clientName} · ${formatDate(lead.eventDate)} · ${formatTime(lead.startTime)}–${formatTime(lead.endTime)} · ${lead.location?.cityName ?? '—'} · ${lead.participants} משתתפים
            </p>
            ${movedToDone ? '<p style="color:#3D5A30;font-weight:bold;margin:0 0 12px;">✅ הליד עבר אוטומטית לסטטוס "בוצע".</p>' : ''}

            <h3 style="font-size:15px;margin:16px 0 6px;">גלידה (יצא / חזר בק"ג / עלות נטו)</h3>
            <table style="width:100%;border-collapse:collapse;font-size:13px;">
              <tr style="background:#FAF4E9;color:#666;">
                <td style="padding:5px 8px;">טעם</td>
                <td style="padding:5px 8px;text-align:center;">יצא ק"ג</td>
                <td style="padding:5px 8px;text-align:center;">חזר ק"ג</td>
                <td style="padding:5px 8px;text-align:left;">עלות נטו</td>
              </tr>
              ${flavorRows}
            </table>

            <h3 style="font-size:15px;margin:18px 0 6px;">סיכום</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;">
              ${costLine('גלידה שיצאה', cost.iceCreamOut)}
              ${cost.iceCreamReturn > 0 ? `<tr><td style="padding:3px 8px;color:#3D5A30;">זיכוי החזרות</td><td style="padding:3px 8px;text-align:left;color:#3D5A30;">−${formatNIS(cost.iceCreamReturn)}</td></tr>` : ''}
              ${costLine('גלידה נטו', cost.iceCreamNet)}
              ${costLine('כלי הגשה', cost.utensilsCost)}
              ${managerCost > 0 ? costLine('מנהל אירוע', managerCost) : ''}
              ${assistantsCost > 0 ? costLine('עוזרים', assistantsCost) : ''}
              ${logisticsCost > 0 ? costLine('לוגיסטיקה', logisticsCost) : ''}
              <tr style="border-top:2px solid #5E2A33;font-weight:bold;font-size:16px;">
                <td style="padding:8px;">סה"כ עלות האירוע</td>
                <td style="padding:8px;text-align:left;color:#5E2A33;">${formatNIS(grandTotal)}</td>
              </tr>
            </table>

            <a href="${appUrl}/leads/${lead.id}"
               style="display:inline-block;margin-top:18px;background:#5E2A33;color:#FAF4E9;padding:10px 20px;border-radius:8px;text-decoration:none;">
              פתח את הליד לבדיקה ותיקון
            </a>
          </div>
        `,
      })
    }
  } catch (err) {
    console.error('Cost report email failed:', err)
  }

  return { ok: true, movedToDone }
}
