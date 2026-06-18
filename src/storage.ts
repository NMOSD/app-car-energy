import { PersistedData } from './types'
import { APP_VERSION, DEFAULT_BATTERY_CAPACITY_KWH, DEFAULT_CHARGING_SPEED_KWH } from './constants'

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

  if (Array.isArray(data.stations)) {
    data.stations = data.stations.map((s: any) => ({
      ...s,
      chargingSpeedKWh: s.chargingSpeedKWh ?? DEFAULT_CHARGING_SPEED_KWH
    }))
  }

  if (Array.isArray(data.sessions)) {
    data.sessions = data.sessions.map((s: any) => ({
      ...s,
      startTime: s.startTime || s.date + 'T00:00:00.000Z',
      endTime: s.endTime || s.date + 'T01:00:00.000Z'
    }))
  }

  if (data.inProgressSession && !data.inProgressSession.startTime) {
    data.inProgressSession.startTime = new Date().toISOString()
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
