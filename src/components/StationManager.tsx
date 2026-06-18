import { useState } from 'react'
import { ChargingStation } from '../types'
import { StationForm } from './StationForm'
import { formatCurrency } from '../utils'

interface Props {
  stations: ChargingStation[]
  onAdd: (data: Omit<ChargingStation, 'id'>) => void
  onUpdate: (id: string, data: Partial<Omit<ChargingStation, 'id'>>) => void
  onDelete: (id: string) => void
}

export function StationManager({ stations, onAdd, onUpdate, onDelete }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const editingStation = stations.find(s => s.id === editingId) ?? null

  const handleDelete = (id: string) => {
    if (confirm('Eliminar esta estacion y todas sus sesiones de carga?')) {
      onDelete(id)
      if (editingId === id) setEditingId(null)
    }
  }

  return (
    <section className="panel">
      <h2>Estaciones de carga</h2>

      {editingId && editingStation ? (
        <StationForm
          station={editingStation}
          onSave={data => { onUpdate(editingId, data); setEditingId(null) }}
          onCancel={() => setEditingId(null)}
        />
      ) : (
        <StationForm onSave={onAdd} />
      )}

      {stations.length > 0 && (
        <ul className="station-list">
          {stations.map(station => (
            <li key={station.id}>
              <div>
                <strong>{station.name}</strong> &bull; {station.location}
                <div className="station-detail">
                  {station.pricingMethod === 'fixed' ? 'Fijo' : 'Variable (PVPC)'} &bull;{' '}
                  {station.pricingMethod === 'fixed' && <>{formatCurrency(station.unitPricePerKWh)} / kWh &bull; </>}
                  {formatCurrency(station.monthlyTax)} / mes
                </div>
              </div>
              <div className="btn-group">
                <button className="btn-small" onClick={() => setEditingId(station.id)}>Editar</button>
                <button className="btn-small btn-danger" onClick={() => handleDelete(station.id)}>Eliminar</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
