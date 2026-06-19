import { useState, useEffect, useRef } from 'react'
import { ChargingStation, InProgressSession } from '../types'
import { formatDateEU, parseEUDate, todayDate, formatCurrency, calculateKWh, estimateChargeMinutes, formatDuration } from '../utils'
import { fetchCurrentPrice } from '../services/electricityPrice'
import { ChargingCounter } from './ChargingCounter'

function currentTimeHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function combineDateTimeISO(isoDate: string, timeHHMM: string): string {
  return new Date(`${isoDate}T${timeHHMM}:00`).toISOString()
}

interface Props {
  stations: ChargingStation[]
  inProgressSession: InProgressSession | null
  batteryCapacityKWh: number
  onStartCharge: (stationId: string, startPercent: number, date: string, mileageKm?: number, photoTimestamp?: string, startTime?: string) => void
  onCompleteCharge: (endPercent: number, pricePerKWh: number, endTime?: string) => void
  onCancelCharge: () => void
  onSuccess: (message: string) => void
}

export function ChargingFlow({
  stations, inProgressSession, batteryCapacityKWh,
  onStartCharge, onCompleteCharge, onCancelCharge, onSuccess
}: Props) {
  const [stationId, setStationId] = useState('')
  const [startPercent, setStartPercent] = useState(0)
  const [dateInput, setDateInput] = useState(formatDateEU(todayDate()))
  const [startTimeInput, setStartTimeInput] = useState(currentTimeHHMM())
  const [mileageKm, setMileageKm] = useState<string>('')
  const [endPercent, setEndPercent] = useState(0)
  const [endTimeInput, setEndTimeInput] = useState(currentTimeHHMM())
  const [pricePerKWh, setPricePerKWh] = useState(0)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [priceError, setPriceError] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState<string>('')
  const [photoTimestamp, setPhotoTimestamp] = useState<string | undefined>()
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const selectedStation = stations.find(s => s.id === stationId)
  const ipStation = inProgressSession ? stations.find(s => s.id === inProgressSession.stationId) : null

  useEffect(() => {
    if (selectedStation?.pricingMethod === 'fixed') {
      setPricePerKWh(selectedStation.unitPricePerKWh)
    }
  }, [selectedStation])

  useEffect(() => {
    if (inProgressSession && ipStation?.pricingMethod === 'variable') {
      handleFetchPrice()
    }
    if (inProgressSession) {
      setEndTimeInput(currentTimeHHMM())
      if (ipStation?.pricingMethod === 'fixed') {
        setPricePerKWh(ipStation.unitPricePerKWh)
      }
    }
  }, [inProgressSession, ipStation])

  const handleFetchPrice = async () => {
    setFetchingPrice(true)
    setPriceError('')
    try {
      const price = await fetchCurrentPrice()
      setPricePerKWh(price)
    } catch {
      setPriceError('No se pudo obtener el precio. Introduce el precio manualmente.')
    } finally {
      setFetchingPrice(false)
    }
  }

  const handlePhotoCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const timestamp = new Date().toISOString()
    setPhotoTimestamp(timestamp)
    setOcrLoading(true)
    setOcrResult('')
    try {
      const { extractDashboardData } = await import('../services/ocrDashboard')
      const result = await extractDashboardData(file)
      const parts: string[] = []
      if (result.batteryPercent !== null) {
        setStartPercent(result.batteryPercent)
        parts.push(`Bateria: ${result.batteryPercent}%`)
      }
      if (result.mileageKm !== null) {
        setMileageKm(String(result.mileageKm))
        parts.push(`Km: ${result.mileageKm}`)
      }
      setOcrResult(parts.length > 0 ? `Detectado: ${parts.join(', ')}` : 'No se detectaron datos. Introduce los valores manualmente.')
    } catch {
      setOcrResult('Error al procesar la foto. Introduce los valores manualmente.')
    } finally {
      setOcrLoading(false)
      e.target.value = ''
    }
  }

  const handleStart = () => {
    if (!stationId) return
    const isoDate = parseEUDate(dateInput)
    if (!isoDate) return
    if (startPercent < 0 || startPercent > 100) return
    const station = stations.find(s => s.id === stationId)
    const km = mileageKm ? parseInt(mileageKm, 10) : undefined
    const startTimeISO = combineDateTimeISO(isoDate, startTimeInput)
    onStartCharge(stationId, startPercent, isoDate, km, photoTimestamp, startTimeISO)
    onSuccess(`Carga iniciada: ${station?.name} el ${dateInput}`)
    setStationId('')
    setStartPercent(0)
    setDateInput(formatDateEU(todayDate()))
    setStartTimeInput(currentTimeHHMM())
    setMileageKm('')
    setPhotoTimestamp(undefined)
    setOcrResult('')
  }

  const handleComplete = () => {
    if (!inProgressSession) return
    if (endPercent < 0 || endPercent > 100) return
    if (endPercent < inProgressSession.startPercent) {
      alert('El nivel final debe ser mayor o igual al nivel inicial')
      return
    }
    const energyKWh = calculateKWh(inProgressSession.startPercent, endPercent, batteryCapacityKWh)
    const cost = energyKWh * pricePerKWh
    const isoDate = inProgressSession.date
    const endTimeISO = combineDateTimeISO(isoDate, endTimeInput)
    onCompleteCharge(endPercent, pricePerKWh, endTimeISO)
    onSuccess(`Carga registrada: ${energyKWh.toFixed(2)} kWh por ${formatCurrency(cost)}`)
    setEndPercent(0)
    setEndTimeInput(currentTimeHHMM())
    setPricePerKWh(0)
    setPriceError('')
  }

  const handleCancel = () => {
    onCancelCharge()
    setEndPercent(0)
    setEndTimeInput(currentTimeHHMM())
    setPricePerKWh(0)
    setPriceError('')
  }

  if (inProgressSession) {
    const targets = [80, 90, 100].filter(t => t > inProgressSession.startPercent)
    const startHHMM = new Date(inProgressSession.startTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })

    return (
      <section className="panel">
        <h2>Completar carga</h2>

        {ipStation && (
          <ChargingCounter
            startPercent={inProgressSession.startPercent}
            startTime={inProgressSession.startTime}
            batteryCapacityKWh={batteryCapacityKWh}
            chargingSpeedKWh={ipStation.chargingSpeedKWh}
          />
        )}

        <div className="form-row">
          <label>
            Estacion
            <input type="text" value={ipStation?.name || ''} disabled />
          </label>
          <label>
            Fecha
            <input type="text" value={formatDateEU(inProgressSession.date)} disabled />
          </label>
        </div>

        <div className="form-row">
          <label>
            Hora inicio
            <input type="text" value={startHHMM} disabled />
          </label>
          <label>
            Hora fin (HH:MM)
            <input type="time" value={endTimeInput} onChange={e => setEndTimeInput(e.target.value)} />
          </label>
        </div>

        {ipStation && targets.length > 0 && (
          <div className="time-estimates">
            <h4>Tiempo estimado de carga</h4>
            {targets.map(t => (
              <div key={t} className="estimate-row">
                <span>Al {t}%:</span>
                <strong>{formatDuration(estimateChargeMinutes(inProgressSession.startPercent, t, batteryCapacityKWh, ipStation.chargingSpeedKWh))}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="form-row">
          <label>
            Nivel inicial
            <input type="number" value={inProgressSession.startPercent} disabled />
          </label>
          <label>
            Nivel final (%)
            <input type="number" value={endPercent} onChange={e => setEndPercent(Number(e.target.value))} min={0} max={100} />
          </label>
        </div>
        {ipStation?.pricingMethod === 'variable' && (
          <div className="form-row">
            <label>
              Precio por kWh (EUR)
              <input type="number" value={pricePerKWh} onChange={e => setPricePerKWh(Number(e.target.value))} min={0} step={0.0001} />
            </label>
            <div className="price-fetch">
              <button className="btn-small" onClick={handleFetchPrice} disabled={fetchingPrice}>
                {fetchingPrice ? 'Obteniendo...' : 'Obtener precio PVPC'}
              </button>
              {priceError && <span className="error-text">{priceError}</span>}
            </div>
          </div>
        )}
        <div className="form-actions">
          <button onClick={handleComplete}>Confirmar y guardar carga</button>
          <button className="btn-danger" onClick={handleCancel}>Cancelar</button>
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <h2>Iniciar carga</h2>
      <div className="form-row">
        <label>
          Estacion
          <select value={stationId} onChange={e => setStationId(e.target.value)}>
            <option value="">Selecciona estacion</option>
            {stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.chargingSpeedKWh} kW)</option>)}
          </select>
        </label>
        <label>
          Fecha (DD/MM/AAAA)
          <input
            type="text"
            placeholder="DD/MM/AAAA"
            value={dateInput}
            onChange={e => setDateInput(e.target.value)}
          />
        </label>
      </div>
      <div className="form-row">
        <label>
          Hora inicio (HH:MM)
          <input type="time" value={startTimeInput} onChange={e => setStartTimeInput(e.target.value)} />
        </label>
        <label>
          Kilometraje (km)
          <input type="number" value={mileageKm} onChange={e => setMileageKm(e.target.value)} min={0} placeholder="Opcional" />
        </label>
      </div>
      <div className="form-row">
        <label>
          Nivel inicial (%)
          <input type="number" value={startPercent} onChange={e => setStartPercent(Number(e.target.value))} min={0} max={100} />
        </label>
      </div>

      <div className="ocr-section">
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} style={{ display: 'none' }} />
        <input ref={galleryInputRef} type="file" accept="image/*" onChange={handlePhotoCapture} style={{ display: 'none' }} />
        <div className="photo-buttons">
          <button className="btn-camera" onClick={() => cameraInputRef.current?.click()} disabled={ocrLoading}>
            {ocrLoading ? 'Procesando...' : 'Hacer foto'}
          </button>
          <button className="btn-gallery" onClick={() => galleryInputRef.current?.click()} disabled={ocrLoading}>
            Subir foto
          </button>
        </div>
        {ocrResult && <p className="ocr-result">{ocrResult}</p>}
      </div>

      <button onClick={handleStart}>Guardar e iniciar carga</button>

      <div className="vehicle-photo">
        <img src={import.meta.env.BASE_URL + 'DACIA SPRING.png'} alt="Dacia Spring" />
      </div>
    </section>
  )
}
