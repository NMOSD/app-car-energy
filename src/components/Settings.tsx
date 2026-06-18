interface Props {
  batteryCapacityKWh: number
  onUpdate: (value: number) => void
}

export function Settings({ batteryCapacityKWh, onUpdate }: Props) {
  return (
    <section className="panel">
      <h2>Configuracion general</h2>
      <div className="form-row">
        <label>
          Capacidad de bateria (kWh)
          <input
            type="number"
            value={batteryCapacityKWh}
            onChange={e => onUpdate(Number(e.target.value))}
            min={1}
          />
        </label>
      </div>
    </section>
  )
}
