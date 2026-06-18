import {
  doc, collection, getDoc, setDoc, updateDoc, deleteDoc, addDoc,
  onSnapshot, writeBatch, Unsubscribe, DocumentData
} from 'firebase/firestore'
import { db } from '../firebase'
import { ChargingStation, ChargeSession, InProgressSession, AppSettings, ReportFile } from '../types'
import { DEFAULT_BATTERY_CAPACITY_KWH } from '../constants'

function vehicleRef(code: string) {
  return doc(db, 'vehicles', code)
}

function stationsCol(code: string) {
  return collection(db, 'vehicles', code, 'stations')
}

function sessionsCol(code: string) {
  return collection(db, 'vehicles', code, 'sessions')
}

function reportsCol(code: string) {
  return collection(db, 'vehicles', code, 'reports')
}

export async function vehicleExists(code: string): Promise<boolean> {
  const snap = await getDoc(vehicleRef(code))
  return snap.exists()
}

export async function createVehicle(code: string): Promise<void> {
  await setDoc(vehicleRef(code), {
    settings: { batteryCapacityKWh: DEFAULT_BATTERY_CAPACITY_KWH },
    inProgressSession: null
  })
}

export function subscribeToVehicle(
  code: string,
  callback: (settings: AppSettings, inProgress: InProgressSession | null) => void
): Unsubscribe {
  return onSnapshot(vehicleRef(code), (snap) => {
    const data = snap.data() || {}
    const settings: AppSettings = data.settings || { batteryCapacityKWh: DEFAULT_BATTERY_CAPACITY_KWH }
    const inProgress: InProgressSession | null = data.inProgressSession || null
    callback(settings, inProgress)
  })
}

export function subscribeToStations(
  code: string,
  callback: (stations: ChargingStation[]) => void
): Unsubscribe {
  return onSnapshot(stationsCol(code), (snap) => {
    const stations = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChargingStation))
    callback(stations)
  })
}

export function subscribeToSessions(
  code: string,
  callback: (sessions: ChargeSession[]) => void
): Unsubscribe {
  return onSnapshot(sessionsCol(code), (snap) => {
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() } as ChargeSession))
    sessions.sort((a, b) => a.date.localeCompare(b.date))
    callback(sessions)
  })
}

export function subscribeToReports(
  code: string,
  callback: (reports: ReportFile[]) => void
): Unsubscribe {
  return onSnapshot(reportsCol(code), (snap) => {
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() } as ReportFile))
    reports.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    callback(reports)
  })
}

export async function addStation(code: string, station: Omit<ChargingStation, 'id'>): Promise<void> {
  await addDoc(stationsCol(code), station)
}

export async function updateStation(code: string, id: string, updates: Partial<Omit<ChargingStation, 'id'>>): Promise<void> {
  await updateDoc(doc(stationsCol(code), id), updates as DocumentData)
}

export async function deleteStation(code: string, id: string): Promise<void> {
  await deleteDoc(doc(stationsCol(code), id))
}

export async function startCharge(code: string, session: InProgressSession): Promise<void> {
  await updateDoc(vehicleRef(code), { inProgressSession: session })
}

export async function completeCharge(
  code: string,
  session: ChargeSession,
  stationSpeedUpdate?: { id: string; speed: number }
): Promise<void> {
  const batch = writeBatch(db)
  const { id, ...sessionData } = session
  batch.set(doc(sessionsCol(code), id), sessionData)
  batch.update(vehicleRef(code), { inProgressSession: null })
  if (stationSpeedUpdate) {
    batch.update(doc(stationsCol(code), stationSpeedUpdate.id), { chargingSpeedKWh: stationSpeedUpdate.speed })
  }
  await batch.commit()
}

export async function cancelCharge(code: string): Promise<void> {
  await updateDoc(vehicleRef(code), { inProgressSession: null })
}

export async function updateSession(code: string, id: string, updates: Partial<Omit<ChargeSession, 'id'>>): Promise<void> {
  await updateDoc(doc(sessionsCol(code), id), updates as DocumentData)
}

export async function deleteSession(code: string, id: string): Promise<void> {
  await deleteDoc(doc(sessionsCol(code), id))
}

export async function updateSettings(code: string, settings: AppSettings): Promise<void> {
  await updateDoc(vehicleRef(code), { settings })
}

export async function addReport(code: string, report: ReportFile): Promise<void> {
  const { id, ...data } = report
  await setDoc(doc(reportsCol(code), id), data)
}

export async function deleteReport(code: string, id: string): Promise<void> {
  await deleteDoc(doc(reportsCol(code), id))
}

export async function migrateLocalData(
  code: string,
  stations: ChargingStation[],
  sessions: ChargeSession[],
  reports: ReportFile[]
): Promise<void> {
  const batch = writeBatch(db)
  const idMap = new Map<string, string>()

  for (const station of stations) {
    const newRef = doc(stationsCol(code))
    idMap.set(station.id, newRef.id)
    const { id, ...data } = station
    batch.set(newRef, data)
  }

  for (const session of sessions) {
    const { id, ...data } = session
    const mappedStationId = idMap.get(data.stationId) || data.stationId
    batch.set(doc(sessionsCol(code), id), { ...data, stationId: mappedStationId })
  }

  for (const report of reports) {
    const { id, ...data } = report
    batch.set(doc(reportsCol(code), id), data)
  }

  await batch.commit()
}
