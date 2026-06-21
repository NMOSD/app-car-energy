import { useState, useEffect } from 'react'
import { ChargingStation, PricingMethod } from '../types'
import { DEFAULT_CHARGING_SPEED_KWH } from '../constants'

interface Props {
  station?: ChargingStation | null
  onSave: (data: Omit<ChargingStation, 'id'>) => void
  onCancel?: () => void
}

const SPEED_PRESETS = [3, 7, 11, 22]

export function StationForm({ station, onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [monthlyTax, setMonthlyTax] = useState(0)
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('fixed')
  const [unitPricePerKWh, setUnitPricePerKWh] = useState(0)
  const [chargingSpeedKWh, setChargingSpeedKWh] = useState(DEFAULT_CHARGING_SPEED_KWH)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (station) {
      setName(station.name)
      setLocation(station.location)
      setMonthlyTax(station.monthlyTax)
      setPricingMethod(station.pricingMethod)
      setUnitPricePerKWh(station.unitPricePerKWh)
      setChargingSpeedKWh(station.chargingSpeedKWh)
    }
  }, [station])

  const handleSubmit = () => {
    if (!name.trim() || !location.trim() || submitting) return
    setSubmitting(true)
    onSave({ name: name.trim(), location: location.trim(), monthlyTax, pricingMethod, unitPricePerKWh, chargingSpeedKWh })
    if (!station) {
      setName('')
      setLocation('')
      setMonthlyTax(0)
      setPricingMethod('fixed')
      setUnitPricePerKWh(0)
      setChargingSpeedKWh(DEFAULT_CHARGING_SPEED_KWH)
    }
    setTimeout(() => setSubmitting(false), 1000)
  }

  return (
    <div className="station-form">
      <div className="form-row">
        <label>
          Nombre
          <input value={name} onChange={e => setName(e.target.value)} />
        </label>
        <label>
          Ubicacion
          <input value={location} onChange={e => setLocation(e.target.value)} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Coste mensual fijo (EUR)
          <input type="number" value={monthlyTax} onChange={e => setMonthlyTax(Number(e.target.value))} min={0} step={0.01} />
        </label>
        <label>
          Metodo de precio
          <select value={pricingMethod} onChange={e => setPricingMethod(e.target.value as PricingMethod)}>
            <option value="fixed">Fijo</option>
            <option value="variable">Variable (PVPC)</option>
          </select>
        </label>
      </div>
      {pricingMethod === 'fixed' && (
        <div className="form-row">
          <label>
            Precio por kWh (EUR)
            <input type="number" value={unitPricePerKWh} onChange={e => setUnitPricePerKWh(Number(e.target.value))} min={0} step={0.0001} />
          </label>
        </div>
      )}
      <div className="form-row">
        <label>
          Velocidad de carga (kW)
          <input type="number" value={chargingSpeedKWh} onChange={e => setChargingSpeedKWh(Number(e.target.value))} min={0.1} step={0.1} />
        </label>
      </div>
      <div className="speed-presets">
        {SPEED_PRESETS.map(s => (
          <button key={s} type="button" className={`btn-small${chargingSpeedKWh === s ? ' active' : ''}`} onClick={() => setChargingSpeedKWh(s)}>
            {s} kW
          </button>
        ))}
      </div>
      <div className="form-actions">
        <button onClick={handleSubmit} disabled={submitting}>{station ? 'Guardar cambios' : 'Anadir estacion'}</button>
        {onCancel && <button className="btn-secondary" onClick={onCancel}>Cancelar</button>}
      </div>
    </div>
  )
}
