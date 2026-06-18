export interface HourlyPrice {
  hour: string
  price: number
  units: string
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
