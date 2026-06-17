export type PricingMethod = 'fixed' | 'variable'

export interface ChargingStation {
  id: string
  name: string
  location: string
  monthlyTax: number
  pricingMethod: PricingMethod
  unitPricePerKWh: number
}

export interface ChargeSession {
  id: string
  stationId: string
  startPercent: number
  endPercent: number
  batteryCapacityKWh: number
  date: string
  pricePerKWh: number
  energyKWh: number
  cost: number
  notes?: string
}

export interface ReportFile {
  id: string
  filename: string
  content: string
  createdAt: string
}

export interface InProgressSession {
  id: string
  stationId: string
  startPercent: number
  date: string
}

export interface PersistedData {
  version: string
  settings: {
    batteryCapacityKWh: number
  }
  stations: ChargingStation[]
  sessions: ChargeSession[]
  inProgressSession: InProgressSession | null
  reports: ReportFile[]
}
