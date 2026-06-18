import { useEffect, useState } from 'react'
import { PersistedData, ChargingStation, ChargeSession, InProgressSession } from '../types'
import { loadData, saveData } from '../storage'
import { calculateKWh, todayDateTimeISO } from '../utils'
import { v4 as uuidv4 } from 'uuid'

export function usePersistedData() {
  const [data, setData] = useState<PersistedData>(loadData)

  useEffect(() => {
    saveData(data)
  }, [data])

  const addStation = (station: Omit<ChargingStation, 'id'>) => {
    setData(prev => ({
      ...prev,
      stations: [...prev.stations, { ...station, id: uuidv4() }]
    }))
  }

  const updateStation = (id: string, updates: Partial<Omit<ChargingStation, 'id'>>) => {
    setData(prev => ({
      ...prev,
      stations: prev.stations.map(s => s.id === id ? { ...s, ...updates } : s)
    }))
  }

  const deleteStation = (id: string) => {
    setData(prev => ({
      ...prev,
      stations: prev.stations.filter(s => s.id !== id),
      sessions: prev.sessions.filter(s => s.stationId !== id)
    }))
  }

  const startCharge = (stationId: string, startPercent: number, date: string) => {
    const session: InProgressSession = { id: uuidv4(), stationId, startPercent, date }
    setData(prev => ({ ...prev, inProgressSession: session }))
    return session
  }

  const completeCharge = (endPercent: number, pricePerKWh: number) => {
    const ip = data.inProgressSession
    if (!ip) return null
    const capacity = data.settings.batteryCapacityKWh
    const energyKWh = calculateKWh(ip.startPercent, endPercent, capacity)
    const cost = energyKWh * pricePerKWh
    const session: ChargeSession = {
      id: ip.id,
      stationId: ip.stationId,
      startPercent: ip.startPercent,
      endPercent,
      batteryCapacityKWh: capacity,
      date: ip.date,
      pricePerKWh,
      energyKWh,
      cost
    }
    setData(prev => ({
      ...prev,
      sessions: [...prev.sessions, session],
      inProgressSession: null
    }))
    return session
  }

  const cancelCharge = () => {
    setData(prev => ({ ...prev, inProgressSession: null }))
  }

  const updateSession = (id: string, updates: Partial<Omit<ChargeSession, 'id'>>) => {
    setData(prev => ({
      ...prev,
      sessions: prev.sessions.map(s => {
        if (s.id !== id) return s
        const updated = { ...s, ...updates, editedAt: todayDateTimeISO() }
        if (updates.startPercent !== undefined || updates.endPercent !== undefined || updates.batteryCapacityKWh !== undefined) {
          updated.energyKWh = calculateKWh(updated.startPercent, updated.endPercent, updated.batteryCapacityKWh)
        }
        if (updates.pricePerKWh !== undefined || updates.startPercent !== undefined || updates.endPercent !== undefined || updates.batteryCapacityKWh !== undefined) {
          updated.cost = updated.energyKWh * updated.pricePerKWh
        }
        return updated
      })
    }))
  }

  const deleteSession = (id: string) => {
    setData(prev => ({
      ...prev,
      sessions: prev.sessions.filter(s => s.id !== id)
    }))
  }

  const updateSettings = (batteryCapacityKWh: number) => {
    setData(prev => ({
      ...prev,
      settings: { ...prev.settings, batteryCapacityKWh }
    }))
  }

  const addReport = (report: PersistedData['reports'][0]) => {
    setData(prev => ({
      ...prev,
      reports: [report, ...prev.reports]
    }))
  }

  const deleteReport = (id: string) => {
    setData(prev => ({
      ...prev,
      reports: prev.reports.filter(r => r.id !== id)
    }))
  }

  return {
    data,
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
