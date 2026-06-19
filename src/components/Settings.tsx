interface Props {
  batteryCapacityKWh: number
  onUpdate: (value: number) => void
  vehicleCode: string
  onDisconnect: () => void
}

export function Settings({ batteryCapacityKWh, onUpdate, vehicleCode, onDisconnect }: Props) {
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
