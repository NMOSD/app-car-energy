import { useState } from 'react'
import { ChargeSession, ChargingStation } from '../types'
import { formatCurrency, formatDateEU } from '../utils'
import { SessionEditModal } from './SessionEditModal'

interface Props {
  sessions: ChargeSession[]
  stations: ChargingStation[]
  onUpdate: (id: string, updates: Partial<Omit<ChargeSession, 'id'>>) => void
  onDelete: (id: string) => void
}

export function SessionHistory({ sessions, stations, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingSession = sessions.find(s => s.id === editingId)
  const editingStation = editingSession ? stations.find(s => s.id === editingSession.stationId) : undefined

  const handleDelete = (id: string) => {
    if (confirm('Eliminar esta sesion de carga?')) {
      onDelete(id)
    }
  }

  return (
    <section className="panel">
      <h2>Historial de cargas</h2>
      {sessions.length === 0 ? (
        <p className="empty-text">No hay cargas registradas</p>
      ) : (
        <ul className="station-list">
          {[...sessions].reverse().map(session => {
            const station = stations.find(s => s.id === session.stationId)
            return (
              <li key={session.id}>
                <div>
                  <strong>{station?.name || 'Estacion desconocida'}</strong>
                  <div className="session-detail">
                    {formatDateEU(session.date)}: {session.startPercent}% &rarr; {session.endPercent}% = {session.energyKWh.toFixed(2)} kWh
                  </div>
                  <div className="session-cost">
                    {formatCurrency(session.pricePerKWh)}/kWh &bull; {formatCurrency(session.cost)}
                  </div>
                  {session.notes && <div className="session-notes">{session.notes}</div>}
                </div>
                <div className="btn-group">
                  <button className="btn-small" onClick={() => setEditingId(session.id)}>Editar</button>
                  <button className="btn-small btn-danger" onClick={() => handleDelete(session.id)}>Eliminar</button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {editingSession && (
        <SessionEditModal
          session={editingSession}
          station={editingStation}
          onSave={onUpdate}
          onClose={() => setEditingId(null)}
        />
      )}
    </section>
  )
}
