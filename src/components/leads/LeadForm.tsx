'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { calculatePrice, formatNIS } from '@/lib/pricing'
import { calculateInventory } from '@/lib/inventory'
import { MAX_FLAVORS, OPERATIONAL_WARNING, DEFAULT_INCLUDED_ITEMS } from '@/lib/constants'
import type { Flavor, Location, Lead, Extra, DiscountType, ClientType, EventType } from '@/lib/types'

interface LeadFormProps {
  lead?: Lead
  flavors: Flavor[]
  locations: Location[]
  role?: 'admin' | 'sales'
  basketaCostNis: number
}

export default function LeadForm({ lead, flavors, locations, role = 'sales', basketaCostNis }: LeadFormProps) {
  const router = useRouter()
  const isEdit = !!lead

  const [clientName, setClientName] = useState(lead?.client_name ?? '')
  const [clientPhone, setClientPhone] = useState(lead?.client_phone ?? '')
  const [clientType, setClientType] = useState<ClientType>(lead?.client_type ?? 'institutional')
  const [eventType, setEventType] = useState<EventType>(lead?.event_type ?? 'dairy')
  const [eventDate, setEventDate] = useState(lead?.event_date ?? '')
  const [startTime, setStartTime] = useState(lead?.start_time?.slice(0, 5) ?? '18:00')
  const [endTime, setEndTime] = useState(lead?.end_time?.slice(0, 5) ?? '20:00')
  const [locationId, setLocationId] = useState(lead?.location_id ?? '')
  const [participants, setParticipants] = useState(lead?.participants ?? 100)
  const [notes, setNotes] = useState(lead?.notes ?? '')

  const [includedItems, setIncludedItems] = useState<string[]>(
    lead?.included_items && lead.included_items.length > 0
      ? lead.included_items
      : DEFAULT_INCLUDED_ITEMS,
  )

  const [newCity, setNewCity] = useState('')
  const [newCityCost, setNewCityCost] = useState('')
  const [locationsList, setLocationsList] = useState<Location[]>(locations)

  const [selectedFlavors, setSelectedFlavors] = useState<string[]>(
    lead?.flavors?.map((f) => f.id) ?? [],
  )
  const [flavorWarning, setFlavorWarning] = useState(false)

  const [extras, setExtras] = useState<Extra[]>((lead?.quote?.extras as Extra[]) ?? [])
  const [discountType, setDiscountType] = useState<DiscountType | null>(lead?.quote?.discount_type ?? null)
  const [discountValue, setDiscountValue] = useState(lead?.quote?.discount_value ?? 0)
  const [advancePaid, setAdvancePaid] = useState(lead?.quote?.advance_paid ?? 0)
  const [priceOverride, setPriceOverride] = useState<string>(lead?.price_override?.toString() ?? '')
  const [pricePerPersonOverride, setPricePerPersonOverride] = useState<string>(
    lead?.price_per_person_override?.toString() ?? '',
  )

  const [managerIncluded, setManagerIncluded] = useState(lead?.manager_included ?? true)
  const [assistantsCount, setAssistantsCount] = useState(lead?.assistants_count ?? 0)

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const selectedLocation = locationsList.find((l) => l.id === locationId)
  const logisticsCost = selectedLocation?.travel_cost_nis ?? 0

  const pricing = calculatePrice({
    clientType,
    participants,
    logisticsCost,
    extras,
    discountType,
    discountValue,
    advancePaid,
    priceOverride: priceOverride ? Number(priceOverride) : null,
    pricePerPersonOverride: pricePerPersonOverride ? Number(pricePerPersonOverride) : null,
  })

  const inventory = calculateInventory(participants, basketaCostNis)

  const availableFlavors = flavors.filter(
    (f) => f.is_in_stock && (eventType === 'dairy' || f.category === 'parve'),
  )

  function toggleFlavor(id: string) {
    if (selectedFlavors.includes(id)) {
      setSelectedFlavors(selectedFlavors.filter((f) => f !== id))
      setFlavorWarning(false)
    } else {
      if (selectedFlavors.length >= MAX_FLAVORS) { setFlavorWarning(true); return }
      setSelectedFlavors([...selectedFlavors, id])
      setFlavorWarning(false)
    }
  }

  function addIncluded() { setIncludedItems([...includedItems, '']) }
  function updateIncluded(i: number, value: string) {
    const updated = [...includedItems]
    updated[i] = value
    setIncludedItems(updated)
  }
  function removeIncluded(i: number) { setIncludedItems(includedItems.filter((_, idx) => idx !== i)) }

  function addExtra() { setExtras([...extras, { label: '', amount: 0 }]) }
  function updateExtra(i: number, field: keyof Extra, value: string | number) {
    const updated = [...extras]
    updated[i] = { ...updated[i], [field]: value }
    setExtras(updated)
  }
  function removeExtra(i: number) { setExtras(extras.filter((_, idx) => idx !== i)) }

  async function addLocation() {
    if (!newCity.trim() || !newCityCost) return
    const res = await fetch('/api/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cityName: newCity.trim(), travelCostNis: Number(newCityCost) }),
    })
    if (res.ok) {
      const data = await res.json()
      setLocationsList([...locationsList, data])
      setLocationId(data.id)
      setNewCity('')
      setNewCityCost('')
    }
  }

  async function handleSave(status: string) {
    setSaving(true)
    setError('')

    const leadData = {
      clientName: clientName,
      clientPhone: clientPhone,
      clientType: clientType,
      eventType: eventType,
      eventDate: eventDate,
      startTime: startTime,
      endTime: endTime,
      locationId: locationId || null,
      participants,
      status,
      notes,
      includedItems: includedItems.map((s) => s.trim()).filter(Boolean),
      managerIncluded,
      assistantsCount,
      priceOverride: priceOverride ? Number(priceOverride) : null,
      pricePerPersonOverride: pricePerPersonOverride ? Number(pricePerPersonOverride) : null,
      flavors: selectedFlavors,
      quote: {
        basePrice: pricing.basePrice + pricing.extraParticipantsPrice,
        vatAmount: pricing.vatAmount,
        logisticsCost,
        extras,
        discountType,
        discountValue,
        advancePaid,
        balanceDue: pricing.balanceDue,
        totalPrice: pricing.totalPrice,
      },
    }

    let leadId = lead?.id

    if (isEdit) {
      const res = await fetch(`/api/leads/${lead!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      })
      if (!res.ok) { setError('שגיאה בשמירה'); setSaving(false); return }
    } else {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadData),
      })
      if (!res.ok) { setError('שגיאה ביצירת ליד'); setSaving(false); return }
      const data = await res.json()
      leadId = data.id
    }

    router.push(`/leads/${leadId}`)
    router.refresh()
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Basic Info */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 mb-4 text-lg">פרטי לקוח ואירוע</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שם לקוח *</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="שם מלא" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">טלפון *</label>
            <input value={clientPhone} onChange={(e) => setClientPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="050-0000000" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סוג לקוח *</label>
            <select value={clientType} onChange={(e) => setClientType(e.target.value as ClientType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="institutional">מוסדי / חברה</option>
              <option value="private">פרטי</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">סוג אירוע *</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="dairy">אירוע חלבי</option>
              <option value="parve">אירוע פרווה / בשרי</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">תאריך אירוע *</label>
            <input type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">משתתפים *</label>
            <input type="number" value={participants} onChange={(e) => setParticipants(Number(e.target.value))} min={1}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שעת התחלה</label>
            <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" dir="ltr" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">שעת סיום</label>
            <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" dir="ltr" />
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">מיקום</label>
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
            <option value="">בחר מיקום...</option>
            {locationsList.map((l) => (
              <option key={l.id} value={l.id}>{l.city_name} — {formatNIS(l.travel_cost_nis)}</option>
            ))}
          </select>
          <div className="flex gap-2 mt-2">
            <input value={newCity} onChange={(e) => setNewCity(e.target.value)} placeholder="עיר חדשה"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            <input value={newCityCost} onChange={(e) => setNewCityCost(e.target.value)} placeholder="₪ עלות" type="number"
              className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            <button type="button" onClick={addLocation} className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg text-sm hover:bg-gray-200">
              + הוסף
            </button>
          </div>
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">הערות</label>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none" placeholder="הערות נוספות..." />
        </div>
      </section>

      {/* Flavor Selector */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">בחירת טעמים</h2>
          <span className="text-sm font-medium text-gray-600">{selectedFlavors.length}/{MAX_FLAVORS} נבחרו</span>
        </div>
        {flavorWarning && (
          <div className="bg-orange-50 border border-orange-200 text-orange-700 rounded-lg px-4 py-3 text-sm mb-4">
            ⚠️ בחרת {MAX_FLAVORS} טעמים. טעם נוסף מעל 6 כרוך בתוספת תשלום!
          </div>
        )}
        <div className="text-xs text-gray-500 mb-3">
          {eventType === 'dairy' ? 'אירוע חלבי — כל הטעמים' : 'אירוע פרווה — טעמי סורבה/טבעוני בלבד'}
        </div>
        <div className="mb-4">
          <div className="text-xs font-semibold text-gray-400 uppercase mb-2">סורבה / טבעוני</div>
          <div className="flex flex-wrap gap-2">
            {availableFlavors.filter((f) => f.category === 'parve').map((f) => (
              <button key={f.id} type="button" onClick={() => toggleFlavor(f.id)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedFlavors.includes(f.id) ? 'bg-green-500 text-white border-green-500' : 'bg-white text-gray-700 border-gray-300 hover:border-green-400'}`}>
                {f.name}
              </button>
            ))}
          </div>
        </div>
        {eventType === 'dairy' && (
          <div>
            <div className="text-xs font-semibold text-gray-400 uppercase mb-2">שמנת / חלבי</div>
            <div className="flex flex-wrap gap-2">
              {availableFlavors.filter((f) => f.category === 'dairy').map((f) => (
                <button key={f.id} type="button" onClick={() => toggleFlavor(f.id)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedFlavors.includes(f.id) ? 'bg-blue-500 text-white border-blue-500' : 'bg-white text-gray-700 border-gray-300 hover:border-blue-400'}`}>
                  {f.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* מה ההצעה כוללת */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 text-lg">מה ההצעה כוללת</h2>
          <button type="button" onClick={addIncluded} className="text-sm text-blue-600 hover:text-blue-700">+ הוסף פריט</button>
        </div>
        <p className="text-xs text-gray-500 mb-3">הרשימה תופיע בהצעת המחיר. ניתן לערוך/להוסיף לפי בקשת הלקוח.</p>
        <div className="space-y-2">
          {includedItems.map((item, i) => (
            <div key={i} className="flex gap-2 items-center">
              <span className="text-green-600 shrink-0">✓</span>
              <input
                value={item}
                onChange={(e) => updateIncluded(i, e.target.value)}
                placeholder="תיאור פריט שכלול בהצעה"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              <button type="button" onClick={() => removeIncluded(i)} className="text-red-400 hover:text-red-600 px-2 shrink-0">✕</button>
            </div>
          ))}
          {includedItems.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-2">אין פריטים — לחץ &quot;הוסף פריט&quot;</p>
          )}
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
        <h2 className="font-semibold text-gray-900 text-lg mb-4">תמחור</h2>
        {clientType === 'private' && (
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="text-sm font-medium text-blue-800 mb-2">עקיפת מחיר (לקוח פרטי)</div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-blue-700 mb-1">מחיר לנפש (₪)</label>
                <input type="number" value={pricePerPersonOverride}
                  onChange={(e) => { setPricePerPersonOverride(e.target.value); setPriceOverride('') }}
                  placeholder="ברירת מחדל: 38"
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs text-blue-700 mb-1">מחיר סופי ידני (₪)</label>
                <input type="number" value={priceOverride}
                  onChange={(e) => { setPriceOverride(e.target.value); setPricePerPersonOverride('') }}
                  placeholder="עקיפה מלאה"
                  className="w-full border border-blue-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>
          </div>
        )}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">תוספות</span>
            <button type="button" onClick={addExtra} className="text-sm text-blue-600 hover:text-blue-700">+ הוסף תוספת</button>
          </div>
          {extras.map((extra, i) => (
            <div key={i} className="flex gap-2 mb-2">
              <input value={extra.label} onChange={(e) => updateExtra(i, 'label', e.target.value)}
                placeholder="תיאור (שעה נוספת, עובד נוסף...)"
                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <input type="number" value={extra.amount} onChange={(e) => updateExtra(i, 'amount', Number(e.target.value))}
                placeholder="₪" className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <button type="button" onClick={() => removeExtra(i)} className="text-red-400 hover:text-red-600 px-2">✕</button>
            </div>
          ))}
        </div>
        <div className="mb-4">
          <div className="text-sm font-medium text-gray-700 mb-2">הנחה</div>
          <div className="flex gap-2">
            <select value={discountType ?? ''} onChange={(e) => setDiscountType(e.target.value as DiscountType || null)}
              className="w-36 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">ללא הנחה</option>
              <option value="percent">אחוז (%)</option>
              <option value="fixed">סכום קבוע (₪)</option>
            </select>
            {discountType && (
              <input type="number" value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))}
                placeholder={discountType === 'percent' ? '%' : '₪'}
                className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            )}
          </div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-600">מחיר בסיס</span><span>{formatNIS(pricing.basePrice)}</span></div>
          {pricing.extraParticipantsPrice > 0 && (
            <div className="flex justify-between"><span className="text-gray-600">תוספת משתתפים</span><span>{formatNIS(pricing.extraParticipantsPrice)}</span></div>
          )}
          {pricing.logisticsCost > 0 && (
            <div className="flex justify-between"><span className="text-gray-600">לוגיסטיקה</span><span>{formatNIS(pricing.logisticsCost)}</span></div>
          )}
          {pricing.extrasTotal > 0 && (
            <div className="flex justify-between"><span className="text-gray-600">תוספות</span><span>{formatNIS(pricing.extrasTotal)}</span></div>
          )}
          {pricing.discountAmount > 0 && (
            <div className="flex justify-between text-red-600"><span>הנחה</span><span>−{formatNIS(pricing.discountAmount)}</span></div>
          )}
          {pricing.vatAmount != null && (
            <>
              <div className="flex justify-between text-gray-500 text-xs border-t pt-2">
                <span>לפני מע&quot;מ</span><span>{formatNIS(pricing.totalPrice - pricing.vatAmount)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-xs">
                <span>מע&quot;מ (18%)</span><span>{formatNIS(pricing.vatAmount)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between font-bold text-base border-t pt-2">
            <span>סה&quot;כ לתשלום</span>
            <span className="text-blue-700">{formatNIS(pricing.totalPrice)}</span>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">מקדמה ששולמה (₪)</label>
            <input type="number" value={advancePaid} onChange={(e) => setAdvancePaid(Number(e.target.value))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">יתרה לתשלום</label>
            <div className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 font-semibold text-orange-600">
              {formatNIS(pricing.balanceDue)}
            </div>
          </div>
        </div>
      </section>

      {/* Inventory */}
      <section className="bg-amber-50 border border-amber-200 rounded-xl p-6">
        <h2 className="font-semibold text-amber-900 text-lg mb-3">🍦 מחשבון מלאי</h2>
        <div className="grid grid-cols-3 gap-4 text-center mb-4">
          <div className="bg-white rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{inventory.participants}</div>
            <div className="text-xs text-gray-500">משתתפים</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-2xl font-bold text-gray-900">{inventory.gramsNeeded.toLocaleString()}</div>
            <div className="text-xs text-gray-500">גרם נדרש</div>
          </div>
          <div className="bg-white rounded-lg p-3">
            <div className="text-2xl font-bold text-blue-700">{inventory.basketasRequired}</div>
            <div className="text-xs text-gray-500">בסקטות</div>
          </div>
        </div>
        <div className="bg-amber-100 border border-amber-300 rounded-lg p-3 text-sm text-amber-800 font-medium">
          ⚠️ {OPERATIONAL_WARNING}
        </div>
      </section>

      {role === 'admin' && (
        <section className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg mb-4">עובדים (פנימי)</h2>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={managerIncluded} onChange={(e) => setManagerIncluded(e.target.checked)}
                className="w-4 h-4 accent-blue-600" />
              <span className="text-sm text-gray-700">מנהל אירוע (₪500)</span>
            </label>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-700">עוזרים נוספים:</label>
              <input type="number" min={0} max={5} value={assistantsCount} onChange={(e) => setAssistantsCount(Number(e.target.value))}
                className="w-16 border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              <span className="text-xs text-gray-500">(₪300 לכל אחד)</span>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>
      )}

      <div className="flex gap-3 justify-end pb-8">
        <button type="button" onClick={() => router.back()}
          className="px-5 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
          ביטול
        </button>
        <button type="button" onClick={() => handleSave('lead')} disabled={saving}
          className="px-5 py-2.5 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-60">
          שמור כליד
        </button>
        <button type="button" onClick={() => handleSave('quote_sent')} disabled={saving}
          className="px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60">
          {saving ? 'שומר...' : 'שמור ושלח הצעה'}
        </button>
      </div>
    </div>
  )
}
