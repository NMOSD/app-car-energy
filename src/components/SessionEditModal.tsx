import { useState } from 'react'
import { ChargeSession, ChargingStation } from '../types'
import { formatDateEU, parseEUDate } from '../utils'

interface Props {
  session: ChargeSession
  station: ChargingStation | undefined
  onSave: (id: string, updates: Partial<Omit<ChargeSession, 'id'>>) => void
  onClose: () => void
}

function formatDateTime(iso: string): string {
  try {
    const d = new Date(iso)
    return `${d.toLocaleDateString('es-ES')} ${d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
  } catch { return iso }
}

export function SessionEditModal({ session, station, onSave, onClose }: Props) {
  const [dateInput, setDateInput] = useState(formatDateEU(session.date))
  const [startPercent, setStartPercent] = useState(session.startPercent)
  const [endPercent, setEndPercent] = useState(session.endPercent)
  const [pricePerKWh, setPricePerKWh] = useState(session.pricePerKWh)
  const [mileageKm, setMileageKm] = useState<string>(session.mileageKm != null ? String(session.mileageKm) : '')
  const [notes, setNotes] = useState(session.notes || '')

  const handleSave = () => {
    const isoDate = parseEUDate(dateInput)
    if (!isoDate) {
      alert('Fecha no valida. Usa el formato DD/MM/AAAA')
      return
    }
    if (endPercent < startPercent) {
      alert('El nivel final debe ser mayor o igual al nivel inicial')
      return
    }
    onSave(session.id, {
      date: isoDate,
      startPercent,
      endPercent,
      pricePerKWh,
      mileageKm: mileageKm ? parseInt(mileageKm, 10) : undefined,
      notes: notes.trim() || undefined
    })
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>Editar sesion de carga</h3>
        <p className="modal-subtitle">{station?.name || 'Estacion desconocida'}</p>

        {session.startTime && (
          <div className="session-timestamps">
            <span>Inicio: {formatDateTime(session.startTime)}</span>
            {session.endTime && <span> | Fin: {formatDateTime(session.endTime)}</span>}
          </div>
        )}

        <div className="form-row">
          <label>
            Fecha (DD/MM/AAAA)
            <input type="text" value={dateInput} onChange={e => setDateInput(e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Inicio (%)
            <input type="number" value={startPercent} onChange={e => setStartPercent(Number(e.target.value))} min={0} max={100} />
          </label>
          <label>
            Final (%)
            <input type="number" value={endPercent} onChange={e => setEndPercent(Number(e.target.value))} min={0} max={100} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Precio por kWh (EUR)
            <input type="number" value={pricePerKWh} onChange={e => setPricePerKWh(Number(e.target.value))} min={0} step={0.0001} />
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
