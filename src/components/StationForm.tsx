import { useState, useEffect } from 'react'
import { ChargingStation, PricingMethod } from '../types'

interface Props {
  station?: ChargingStation | null
  onSave: (data: Omit<ChargingStation, 'id'>) => void
  onCancel?: () => void
}

export function StationForm({ station, onSave, onCancel }: Props) {
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [monthlyTax, setMonthlyTax] = useState(0)
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('fixed')
  const [unitPricePerKWh, setUnitPricePerKWh] = useState(0)

  useEffect(() => {
    if (station) {
      setName(station.name)
      setLocation(station.location)
      setMonthlyTax(station.monthlyTax)
      setPricingMethod(station.pricingMethod)
      setUnitPricePerKWh(station.unitPricePerKWh)
    }
  }, [station])

  const handleSubmit = () => {
    if (!name.trim() || !location.trim()) return
    onSave({ name: name.trim(), location: location.trim(), monthlyTax, pricingMethod, unitPricePerKWh })
    if (!station) {
      setName('')
      setLocation('')
      setMonthlyTax(0)
      setPricingMethod('fixed')
      setUnitPricePerKWh(0)
    }
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
      <div className="form-actions">
        <button onClick={handleSubmit}>{station ? 'Guardar cambios' : 'Anadir estacion'}</button>
        {onCancel && <button className="btn-secondary" onClick={onCancel}>Cancelar</button>}
      </div>
    </div>
  )
}
