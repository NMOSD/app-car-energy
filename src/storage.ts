import { PersistedData } from './types'
import { APP_VERSION, DEFAULT_BATTERY_CAPACITY_KWH } from './constants'

const STORAGE_KEY = 'app-car-energy-data'

const defaultData: PersistedData = {
  version: APP_VERSION,
  settings: {
    batteryCapacityKWh: DEFAULT_BATTERY_CAPACITY_KWH
  },
  stations: [],
  sessions: [],
  inProgressSession: null,
  reports: []
}

function migrateData(raw: any): PersistedData {
  const data = { ...defaultData, ...raw }
  data.settings = { ...defaultData.settings, ...raw.settings }
  data.version = APP_VERSION

  if (Array.isArray(data.reports)) {
    data.reports = data.reports.map((r: any) => ({
      ...r,
      format: r.format || (r.filename?.endsWith('.json') ? 'json' : 'txt')
    }))
  }

  return data
}

export function loadData(): PersistedData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { ...defaultData }
  try {
    return migrateData(JSON.parse(raw))
  } catch {
    return { ...defaultData }
  }
}

export function saveData(data: PersistedData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, version: APP_VERSION }))
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY)
}
