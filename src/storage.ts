import { PersistedData } from './types'

const STORAGE_KEY = 'app-car-energy-data'

const defaultData: PersistedData = {
  version: '0.1.0',
  settings: {
    batteryCapacityKWh: 60
  },
  stations: [],
  sessions: [],
  inProgressSession: null,
  reports: []
}

export function loadData(): PersistedData {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return defaultData
  try {
    const parsed = JSON.parse(raw) as PersistedData
    return {
      ...defaultData,
      ...parsed,
      settings: {
        ...defaultData.settings,
        ...parsed.settings
      }
    }
  } catch (error) {
    console.error('Failed to parse local storage data', error)
    return defaultData
  }
}

export function saveData(data: PersistedData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearData(): void {
  localStorage.removeItem(STORAGE_KEY)
}
