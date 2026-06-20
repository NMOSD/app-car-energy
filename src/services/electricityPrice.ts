import { PeajesConfig } from '../types'

export type TariffPeriod = 'P1' | 'P2' | 'P3'

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

function todayDateRange(): { start: string; end: string } {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return {
    start: `${y}-${m}-${d}T00:00`,
    end: `${y}-${m}-${d}T23:59`
  }
}

export async function fetchTodayPrices(): Promise<HourlyPrice[]> {
  const { start, end } = todayDateRange()
  const url = `https://apidatos.ree.es/es/datos/mercados/precios-mercados-tiempo-real?start_date=${start}&end_date=${end}&time_trunc=hour`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`API error: ${res.status}`)
  const data = await res.json()
  const pvpc = data.included?.find((i: any) => i.type === 'PVPC')
  if (!pvpc) throw new Error('No PVPC data found')
  return pvpc.attributes.values.map((v: any) => {
    const hour = new Date(v.datetime).getHours()
    return {
      hour: `${String(hour).padStart(2, '0')}-${String(hour + 1).padStart(2, '0')}`,
      price: v.value / 1000,
      units: '€/kWh'
    }
  })
}

export function getTariffPeriod(hour: number, date: Date): TariffPeriod {
  const day = date.getDay()
  if (day === 0 || day === 6) return 'P3'
  const month = date.getMonth() + 1
  const isSummer = month >= 4 && month <= 9
  if (isSummer) {
    if (hour >= 10 && hour < 14) return 'P1'
    if ((hour >= 8 && hour < 10) || (hour >= 14 && hour < 18)) return 'P2'
    return 'P3'
  } else {
    if (hour >= 18 && hour < 22) return 'P1'
    if ((hour >= 8 && hour < 18) || (hour >= 22 && hour < 24)) return 'P2'
    return 'P3'
  }
}

export function applyPeajes(prices: HourlyPrice[], peajes: PeajesConfig, date: Date): HourlyPrice[] {
  return prices.map(p => {
    const hour = parseHourKey(p.hour)
    const period = getTariffPeriod(hour, date)
    const peaje = peajes[period.toLowerCase() as keyof PeajesConfig]
    return { ...p, price: p.price + peaje }
  })
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
