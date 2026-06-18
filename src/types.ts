export type PricingMethod = 'fixed' | 'variable'

export interface ChargingStation {
  id: string
  name: string
  location: string
  monthlyTax: number
  pricingMethod: PricingMethod
  unitPricePerKWh: number
  chargingSpeedKWh: number
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
  mileageKm?: number
  startTime: string
  endTime: string
  photoTimestamp?: string
  notes?: string
  editedAt?: string
}

export interface ReportFile {
  id: string
  filename: string
  content: string
  format: 'txt' | 'json' | 'pdf' | 'docx'
  createdAt: string
}

export interface InProgressSession {
  id: string
  stationId: string
  startPercent: number
  date: string
  mileageKm?: number
  startTime: string
  photoTimestamp?: string
}

export interface AppSettings {
  batteryCapacityKWh: number
}

export interface PersistedData {
  version: string
  settings: AppSettings
  stations: ChargingStation[]
  sessions: ChargeSession[]
  inProgressSession: InProgressSession | null
  reports: ReportFile[]
}
