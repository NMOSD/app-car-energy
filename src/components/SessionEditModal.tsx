import { useState } from 'react'
import { ChargeSession, ChargingStation } from '../types'
import { formatDateEU, parseEUDate } from '../utils'

interface Props {
  session: ChargeSession
  station: ChargingStation | undefined
  onSave: (id: string, updates: Partial<Omit<ChargeSession, 'id'>>) => void
  onClose: () => void
}

function isoToHHMM(iso: string): string {
  try {
    const d = new Date(iso)
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  } catch { return '' }
}

function combineDateTimeISO(isoDate: string, timeHHMM: string): string {
  return new Date(`${isoDate}T${timeHHMM}:00`).toISOString()
}

export function SessionEditModal({ session, station, onSave, onClose }: Props) {
  const [dateInput, setDateInput] = useState(formatDateEU(session.date))
  const [startPercent, setStartPercent] = useState(String(session.startPercent))
  const [endPercent, setEndPercent] = useState(String(session.endPercent))
  const [pricePerKWh, setPricePerKWh] = useState(String(session.pricePerKWh))
  const [mileageKm, setMileageKm] = useState<string>(session.mileageKm != null ? String(session.mileageKm) : '')
  const [startTimeInput, setStartTimeInput] = useState(session.startTime ? isoToHHMM(session.startTime) : '')
  const [endTimeInput, setEndTimeInput] = useState(session.endTime ? isoToHHMM(session.endTime) : '')
  const [notes, setNotes] = useState(session.notes || '')

  const handleSave = () => {
    const isoDate = parseEUDate(dateInput)
    if (!isoDate) {
      alert('Fecha no valida. Usa el formato DD/MM/AAAA')
      return
    }
    const startPct = startPercent === '' ? 0 : Number(startPercent)
    const endPct = endPercent === '' ? 0 : Number(endPercent)
    if (endPct < startPct) {
      alert('El nivel final debe ser mayor o igual al nivel inicial')
      return
    }
    const updates: Partial<Omit<ChargeSession, 'id'>> = {
      date: isoDate,
      startPercent: startPct,
      endPercent: endPct,
      pricePerKWh: pricePerKWh === '' ? 0 : Number(pricePerKWh),
      mileageKm: mileageKm ? parseInt(mileageKm, 10) : undefined,
      notes: notes.trim() || undefined
    }
    if (startTimeInput) {
      updates.startTime = combineDateTimeISO(isoDate, startTimeInput)
    }
    if (endTimeInput) {
      updates.endTime = combineDateTimeISO(isoDate, endTimeInput)
    }
    onSave(session.id, updates)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Editar sesion de carga</h3>
        <p className="modal-subtitle">{station?.name || 'Estacion desconocida'}</p>

        <div className="form-row">
          <label>
            Fecha (DD/MM/AAAA)
            <input type="text" value={dateInput} onChange={e => setDateInput(e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Hora inicio (HH:MM)
            <input type="time" value={startTimeInput} onChange={e => setStartTimeInput(e.target.value)} />
          </label>
          <label>
            Hora fin (HH:MM)
            <input type="time" value={endTimeInput} onChange={e => setEndTimeInput(e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Inicio (%)
            <input type="number" value={startPercent} onChange={e => setStartPercent(e.target.value)} min={0} max={100} placeholder="0" />
          </label>
          <label>
            Final (%)
            <input type="number" value={endPercent} onChange={e => setEndPercent(e.target.value)} min={0} max={100} placeholder="0" />
          </label>
        </div>
        <div className="form-row">
          <label>
            Precio por kWh (EUR)
            <input type="number" value={pricePerKWh} onChange={e => setPricePerKWh(e.target.value)} min={0} step={0.0001} placeholder="0" />
          </label>
          <label>
            Kilometraje (km)
            <input type="number" value={mileageKm} onChange={e => setMileageKm(e.target.value)} min={0} placeholder="Opcional" />
          </label>
        </div>
        <div className="form-row">
          <label>
            Notas
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Opcional" />
          </label>
        </div>
        <div className="form-actions">
          <button onClick={handleSave}>Guardar</button>
          <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  )
}
