import { useState } from 'react'
import { AppSettings, PeajesConfig } from '../types'

interface Props {
  settings: AppSettings
  onUpdateSettings: (updates: Partial<AppSettings>) => void
  vehicleCode: string
  onDisconnect: () => void
}

export function Settings({ settings, onUpdateSettings, vehicleCode, onDisconnect }: Props) {
  const [p1, setP1] = useState(String(settings.peajes.p1))
  const [p2, setP2] = useState(String(settings.peajes.p2))
  const [p3, setP3] = useState(String(settings.peajes.p3))

  const handlePeajesSave = () => {
    const peajes: PeajesConfig = {
      p1: Number(p1) || 0,
      p2: Number(p2) || 0,
      p3: Number(p3) || 0
    }
    onUpdateSettings({ peajes })
  }

  return (
    <section className="panel">
      <h2>Configuracion general</h2>
      <div className="form-row">
        <label>
          Capacidad de bateria (kWh)
          <input
            type="number"
            value={settings.batteryCapacityKWh}
            onChange={e => onUpdateSettings({ batteryCapacityKWh: Number(e.target.value) })}
            min={1}
          />
        </label>
      </div>

      <div className="peajes-section">
        <h3>Peajes y cargos (tarifa 2.0TD)</h3>
        <p className="peajes-hint">Valores en EUR/kWh que se suman al precio de energia de la REE para obtener el precio PVPC completo. Consulta energiaxxi.com para verificar.</p>
        <div className="form-row">
          <label>
            P1 - Punta
            <input type="number" value={p1} onChange={e => setP1(e.target.value)} min={0} step={0.001} placeholder="0.077" />
          </label>
          <label>
            P2 - Llano
            <input type="number" value={p2} onChange={e => setP2(e.target.value)} min={0} step={0.001} placeholder="0.019" />
          </label>
          <label>
            P3 - Valle
            <input type="number" value={p3} onChange={e => setP3(e.target.value)} min={0} step={0.001} placeholder="0.003" />
          </label>
        </div>
        <button className="btn-small" onClick={handlePeajesSave} style={{ marginTop: 8 }}>Guardar peajes</button>
      </div>

      <div className="vehicle-code-section">
        <h3>Vehiculo conectado</h3>
        <p className="vehicle-code-display">{vehicleCode}</p>
        <p className="vehicle-code-hint">Comparte este codigo con otros usuarios del vehiculo para sincronizar datos.</p>
        <button className="btn-danger btn-small" onClick={onDisconnect}>Desconectar vehiculo</button>
      </div>

      <div className="vehicle-photo">
        <img src={import.meta.env.BASE_URL + 'DACIA SPRING.png'} alt="Dacia Spring" />
      </div>
    </section>
  )
}
