import { useState, useEffect, useRef } from 'react'
import { ChargingStation, InProgressSession } from '../types'
import { formatDateEU, parseEUDate, todayDate, formatCurrency, calculateKWh, estimateChargeMinutes, formatDuration } from '../utils'
import { fetchCurrentPrice } from '../services/electricityPrice'
import { ChargingCounter } from './ChargingCounter'

interface Props {
  stations: ChargingStation[]
  inProgressSession: InProgressSession | null
  batteryCapacityKWh: number
  onStartCharge: (stationId: string, startPercent: number, date: string, mileageKm?: number, photoTimestamp?: string) => void
  onCompleteCharge: (endPercent: number, pricePerKWh: number) => void
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
  const [mileageKm, setMileageKm] = useState<string>('')
  const [endPercent, setEndPercent] = useState(0)
  const [pricePerKWh, setPricePerKWh] = useState(0)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [priceError, setPriceError] = useState('')
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrResult, setOcrResult] = useState<string>('')
  const [photoTimestamp, setPhotoTimestamp] = useState<string | undefined>()
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    }
  }

  const handleStart = () => {
    if (!stationId) return
    const isoDate = parseEUDate(dateInput)
    if (!isoDate) return
    if (startPercent < 0 || startPercent > 100) return
    const station = stations.find(s => s.id === stationId)
    const km = mileageKm ? parseInt(mileageKm, 10) : undefined
    onStartCharge(stationId, startPercent, isoDate, km, photoTimestamp)
    onSuccess(`Carga iniciada: ${station?.name} el ${dateInput}`)
    setStationId('')
    setStartPercent(0)
    setDateInput(formatDateEU(todayDate()))
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
    onCompleteCharge(endPercent, pricePerKWh)
    onSuccess(`Carga registrada: ${energyKWh.toFixed(2)} kWh por ${formatCurrency(cost)}`)
    setEndPercent(0)
    setPricePerKWh(0)
    setPriceError('')
  }

  const handleCancel = () => {
    onCancelCharge()
    setEndPercent(0)
    setPricePerKWh(0)
    setPriceError('')
  }

  if (inProgressSession) {
    const targets = [80, 90, 100].filter(t => t > inProgressSession.startPercent)

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
          Nivel inicial (%)
          <input type="number" value={startPercent} onChange={e => setStartPercent(Number(e.target.value))} min={0} max={100} />
        </label>
        <label>
          Kilometraje (km)
          <input type="number" value={mileageKm} onChange={e => setMileageKm(e.target.value)} min={0} placeholder="Opcional" />
        </label>
      </div>

      <div className="ocr-section">
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handlePhotoCapture} style={{ display: 'none' }} />
        <button className="btn-camera" onClick={() => fileInputRef.current?.click()} disabled={ocrLoading}>
          {ocrLoading ? 'Procesando foto...' : 'Capturar desde foto'}
        </button>
        {ocrResult && <p className="ocr-result">{ocrResult}</p>}
      </div>

      <button onClick={handleStart}>Guardar e iniciar carga</button>
    </section>
  )
}
