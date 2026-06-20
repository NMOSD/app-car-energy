export interface HourlyPrice {
  hour: string
  price: number
  units: string
}

export interface HourlySlot {
  hourLabel: string
  minutes: number
  kWh: number
  pricePerKWh: number
  cost: number
}

export interface HourlyCostResult {
  slots: HourlySlot[]
  totalKWh: number
  totalCost: number
  avgPricePerKWh: number
}

export async function fetchCurrentPrice(): Promise<number> {
  const res = await fetch('https://api.preciodelaluz.org/v1/prices/now?zone=PCB')
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return data.price / 1000
}

export async function fetchTodayPrices(): Promise<HourlyPrice[]> {
  const res = await fetch('https://api.preciodelaluz.org/v1/prices/all?zone=PCB')
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  return Object.entries(data).map(([hour, info]: [string, any]) => ({
    hour,
    price: info.price / 1000,
    units: '€/kWh'
  }))
}

function parseHourKey(key: string): number {
  return parseInt(key.split('-')[0], 10)
}

function buildPriceMap(prices: HourlyPrice[]): Map<number, number> {
  const map = new Map<number, number>()
  for (const p of prices) {
    map.set(parseHourKey(p.hour), p.price)
  }
  return map
}

export function calculateHourlyCost(
  startTimeISO: string,
  endTimeISO: string,
  chargingSpeedKWh: number,
  prices: HourlyPrice[]
): HourlyCostResult {
  const start = new Date(startTimeISO)
  const end = new Date(endTimeISO)
  const priceMap = buildPriceMap(prices)

  const slots: HourlySlot[] = []
  let cursor = new Date(start)

  while (cursor < end) {
    const hour = cursor.getHours()
    const slotEnd = new Date(cursor)
    slotEnd.setMinutes(0, 0, 0)
    slotEnd.setHours(hour + 1)
    const effectiveEnd = slotEnd > end ? end : slotEnd

    const minutes = (effectiveEnd.getTime() - cursor.getTime()) / 60000
    if (minutes > 0) {
      const kWh = chargingSpeedKWh * (minutes / 60)
      const pricePerKWh = priceMap.get(hour) ?? 0
      slots.push({
        hourLabel: `${String(hour).padStart(2, '0')}:00–${String((hour + 1) % 24).padStart(2, '0')}:00`,
        minutes: Math.round(minutes),
        kWh,
        pricePerKWh,
        cost: kWh * pricePerKWh
      })
    }
    cursor = effectiveEnd
  }

  const totalKWh = slots.reduce((s, sl) => s + sl.kWh, 0)
  const totalCost = slots.reduce((s, sl) => s + sl.cost, 0)
  const avgPricePerKWh = totalKWh > 0 ? totalCost / totalKWh : 0

  return { slots, totalKWh, totalCost, avgPricePerKWh }
}
