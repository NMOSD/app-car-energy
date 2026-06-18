import { useEffect, useState, useCallback, useRef } from 'react'
import { PersistedData, ChargingStation, ChargeSession, InProgressSession, AppSettings, ReportFile } from '../types'
import { calculateKWh, todayDateTimeISO } from '../utils'
import { ensureAuth } from '../firebase'
import {
  subscribeToVehicle, subscribeToStations, subscribeToSessions, subscribeToReports,
  addStation as fsAddStation, updateStation as fsUpdateStation, deleteStation as fsDeleteStation,
  startCharge as fsStartCharge, completeCharge as fsCompleteCharge, cancelCharge as fsCancelCharge,
  updateSession as fsUpdateSession, deleteSession as fsDeleteSession,
  updateSettings as fsUpdateSettings, addReport as fsAddReport, deleteReport as fsDeleteReport
} from '../services/firestore'
import { DEFAULT_BATTERY_CAPACITY_KWH } from '../constants'
import { v4 as uuidv4 } from 'uuid'

const VEHICLE_CODE_KEY = 'carEnergy_vehicleCode'

export function getVehicleCode(): string | null {
  return localStorage.getItem(VEHICLE_CODE_KEY)
}

export function setVehicleCode(code: string) {
  localStorage.setItem(VEHICLE_CODE_KEY, code)
}

export function clearVehicleCode() {
  localStorage.removeItem(VEHICLE_CODE_KEY)
}

const emptyData: PersistedData = {
  version: '2.0.0',
  settings: { batteryCapacityKWh: DEFAULT_BATTERY_CAPACITY_KWH },
  stations: [],
  sessions: [],
  inProgressSession: null,
  reports: []
}

export function usePersistedData(vehicleCode: string) {
  const [data, setData] = useState<PersistedData>(emptyData)
  const [ready, setReady] = useState(false)
  const codeRef = useRef(vehicleCode)
  codeRef.current = vehicleCode

  useEffect(() => {
    let cancelled = false
    const unsubs: (() => void)[] = []

    ensureAuth().then(() => {
      if (cancelled) return

      unsubs.push(subscribeToVehicle(vehicleCode, (settings: AppSettings, inProgress: InProgressSession | null) => {
        setData(prev => ({ ...prev, settings, inProgressSession: inProgress }))
        setReady(true)
      }))

      unsubs.push(subscribeToStations(vehicleCode, (stations: ChargingStation[]) => {
        setData(prev => ({ ...prev, stations }))
      }))

      unsubs.push(subscribeToSessions(vehicleCode, (sessions: ChargeSession[]) => {
        setData(prev => ({ ...prev, sessions }))
      }))

      unsubs.push(subscribeToReports(vehicleCode, (reports: ReportFile[]) => {
        setData(prev => ({ ...prev, reports }))
      }))
    })

    return () => {
      cancelled = true
      unsubs.forEach(fn => fn())
    }
  }, [vehicleCode])

  const addStation = useCallback((station: Omit<ChargingStation, 'id'>) => {
    fsAddStation(codeRef.current, station)
  }, [])

  const updateStation = useCallback((id: string, updates: Partial<Omit<ChargingStation, 'id'>>) => {
    fsUpdateStation(codeRef.current, id, updates)
  }, [])

  const deleteStation = useCallback((id: string) => {
    fsDeleteStation(codeRef.current, id)
  }, [])

  const startCharge = useCallback((stationId: string, startPercent: number, date: string, mileageKm?: number, photoTimestamp?: string) => {
    const session: InProgressSession = {
      id: uuidv4(), stationId, startPercent, date,
      mileageKm, startTime: new Date().toISOString(), photoTimestamp
    }
    fsStartCharge(codeRef.current, session)
    return session
  }, [])

  const completeCharge = useCallback((endPercent: number, pricePerKWh: number) => {
    const ip = data.inProgressSession
    if (!ip) return null
    const capacity = data.settings.batteryCapacityKWh
    const energyKWh = calculateKWh(ip.startPercent, endPercent, capacity)
    const cost = energyKWh * pricePerKWh
    const endTime = new Date().toISOString()
    const session: ChargeSession = {
      id: ip.id,
      stationId: ip.stationId,
      startPercent: ip.startPercent,
      endPercent,
      batteryCapacityKWh: capacity,
      date: ip.date,
      pricePerKWh,
      energyKWh,
      cost,
      mileageKm: ip.mileageKm,
      startTime: ip.startTime,
      endTime,
      photoTimestamp: ip.photoTimestamp
    }

    const durationHours = (new Date(endTime).getTime() - new Date(ip.startTime).getTime()) / 3600000
    let stationSpeedUpdate: { id: string; speed: number } | undefined
    if (durationHours > 0.01 && energyKWh > 0) {
      const measuredSpeed = energyKWh / durationHours
      if (measuredSpeed > 0.5 && measuredSpeed < 350) {
        const station = data.stations.find(s => s.id === ip.stationId)
        if (station) {
          stationSpeedUpdate = { id: station.id, speed: Math.round((0.3 * station.chargingSpeedKWh + 0.7 * measuredSpeed) * 10) / 10 }
        }
      }
    }

    fsCompleteCharge(codeRef.current, session, stationSpeedUpdate)
    return session
  }, [data.inProgressSession, data.settings.batteryCapacityKWh, data.stations])

  const cancelCharge = useCallback(() => {
    fsCancelCharge(codeRef.current)
  }, [])

  const updateSession = useCallback((id: string, updates: Partial<Omit<ChargeSession, 'id'>>) => {
    const current = data.sessions.find(s => s.id === id)
    if (!current) return
    const merged = { ...current, ...updates, editedAt: todayDateTimeISO() }
    if (updates.startPercent !== undefined || updates.endPercent !== undefined || updates.batteryCapacityKWh !== undefined) {
      merged.energyKWh = calculateKWh(merged.startPercent, merged.endPercent, merged.batteryCapacityKWh)
    }
    if (updates.pricePerKWh !== undefined || updates.startPercent !== undefined || updates.endPercent !== undefined || updates.batteryCapacityKWh !== undefined) {
      merged.cost = merged.energyKWh * merged.pricePerKWh
    }
    const { id: _id, ...rest } = merged
    fsUpdateSession(codeRef.current, id, rest)
  }, [data.sessions])

  const deleteSession = useCallback((id: string) => {
    fsDeleteSession(codeRef.current, id)
  }, [])

  const updateSettings = useCallback((batteryCapacityKWh: number) => {
    fsUpdateSettings(codeRef.current, { batteryCapacityKWh })
  }, [])

  const addReport = useCallback((report: ReportFile) => {
    fsAddReport(codeRef.current, report)
  }, [])

  const deleteReport = useCallback((id: string) => {
    fsDeleteReport(codeRef.current, id)
  }, [])

  return {
    data,
    ready,
    addStation,
    updateStation,
    deleteStation,
    startCharge,
    completeCharge,
    cancelCharge,
    updateSession,
    deleteSession,
    updateSettings,
    addReport,
    deleteReport
  }
}
