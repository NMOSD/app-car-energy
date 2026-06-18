import { useState } from 'react'
import { vehicleExists, createVehicle, migrateLocalData } from '../services/firestore'
import { ensureAuth } from '../firebase'
import { loadData } from '../storage'

interface Props {
  onConnect: (code: string) => void
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export function VehicleSetup({ onConnect }: Props) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose')
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const hasLocalData = () => {
    const data = loadData()
    return data.stations.length > 0 || data.sessions.length > 0
  }

  const handleCreate = async () => {
    setLoading(true)
    setError('')
    try {
      await ensureAuth()
      const newCode = generateCode()
      await createVehicle(newCode)

      if (hasLocalData()) {
        const data = loadData()
        await migrateLocalData(newCode, data.stations, data.sessions, data.reports)
      }

      onConnect(newCode)
    } catch {
      setError('Error al crear el vehiculo. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleJoin = async () => {
    const trimmed = code.trim().toUpperCase()
    if (trimmed.length < 4) {
      setError('Introduce un codigo valido')
      return
    }
    setLoading(true)
    setError('')
    try {
      await ensureAuth()
      const exists = await vehicleExists(trimmed)
      if (!exists) {
        setError('No se encontro ningun vehiculo con ese codigo')
        setLoading(false)
        return
      }
      onConnect(trimmed)
    } catch {
      setError('Error al conectar. Comprueba tu conexion.')
    } finally {
      setLoading(false)
    }
  }

  if (mode === 'choose') {
    return (
      <div className="vehicle-setup">
        <div className="setup-card">
          <h1>App Car Energy</h1>
          <p className="setup-subtitle">Conecta con tu vehiculo para sincronizar datos entre dispositivos</p>

          <button onClick={() => { setMode('create'); setError('') }} className="setup-btn-primary">
            Crear vehiculo nuevo
          </button>
          <button onClick={() => { setMode('join'); setError('') }} className="setup-btn-secondary">
            Unirse a vehiculo existente
          </button>
        </div>
      </div>
    )
  }

  if (mode === 'create') {
    return (
      <div className="vehicle-setup">
        <div className="setup-card">
          <h2>Crear vehiculo</h2>
          <p>Se generara un codigo unico que podras compartir con otros usuarios del vehiculo.</p>
          {hasLocalData() && (
            <p className="setup-migrate-note">Se migraran tus datos locales existentes al nuevo vehiculo.</p>
          )}
          {error && <p className="setup-error">{error}</p>}
          <button onClick={handleCreate} disabled={loading} className="setup-btn-primary">
            {loading ? 'Creando...' : 'Crear vehiculo'}
          </button>
          <button onClick={() => setMode('choose')} className="setup-btn-back">Volver</button>
        </div>
      </div>
    )
  }

  return (
    <div className="vehicle-setup">
      <div className="setup-card">
        <h2>Unirse a vehiculo</h2>
        <p>Introduce el codigo del vehiculo compartido:</p>
        <input
          type="text"
          value={code}
          onChange={e => setCode(e.target.value.toUpperCase())}
          placeholder="Ej: ABC123"
          maxLength={6}
          className="setup-code-input"
          autoFocus
        />
        {error && <p className="setup-error">{error}</p>}
        <button onClick={handleJoin} disabled={loading || !code.trim()} className="setup-btn-primary">
          {loading ? 'Conectando...' : 'Conectar'}
        </button>
        <button onClick={() => setMode('choose')} className="setup-btn-back">Volver</button>
      </div>
    </div>
  )
}
