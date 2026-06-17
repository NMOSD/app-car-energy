import { ChangeEvent, useEffect, useRef, useState } from 'react'
import { ChargingStation, ChargeSession, InProgressSession, PersistedData, PricingMethod, ReportFile } from './types'
import { loadData, saveData } from './storage'
import { v4 as uuidv4 } from 'uuid'

const todayDate = () => new Date().toISOString().slice(0, 10)

function calculateKWh(start: number, end: number, capacity: number) {
  return Math.max(0, ((end - start) / 100) * capacity)
}

function countMonthsInRange(from: string, to: string) {
  const fromDate = new Date(from)
  const toDate = new Date(to)
  if (toDate < fromDate) return 0
  return (toDate.getFullYear() - fromDate.getFullYear()) * 12 + toDate.getMonth() - fromDate.getMonth() + 1
}

function formatCurrency(value: number) {
  return `${value.toFixed(2)} €`
}

function formatDateEU(isoDate: string) {
  const [year, month, day] = isoDate.split('-')
  return `${day}/${month}/${year}`
}

function parseEUDate(euDate: string): string | null {
  const parts = euDate.split('/')
  if (parts.length !== 3) return null
  const [day, month, year] = parts
  const isoDate = `${year}-${month}-${day}`
  if (!/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) return null
  return isoDate
}

function createTextReport(station: ChargingStation, sessions: ChargeSession[], includeMonthlyTax: boolean, months: number) {
  const totalKWh = sessions.reduce((sum, session) => sum + session.energyKWh, 0)
  const totalCost = sessions.reduce((sum, session) => sum + session.cost, 0)
  const fixedCost = includeMonthlyTax ? station.monthlyTax * months : 0
  return [
    `Reporte de carga - ${station.name}`,
    `Ubicación: ${station.location}`,
    `Periodo: ${sessions.length ? formatDateEU(sessions[0].date) : ''} a ${sessions.length ? formatDateEU(sessions[sessions.length - 1].date) : ''}`,
    `Incluye coste mensual: ${includeMonthlyTax ? 'Sí' : 'No'}`,
    `Meses en rango: ${months}`,
    `KWh total: ${totalKWh.toFixed(2)}`,
    `Coste de energía: ${formatCurrency(totalCost)}`,
    `Coste fijo total: ${formatCurrency(fixedCost)}`,
    `Coste total: ${formatCurrency(totalCost + fixedCost)}`,
    '',
    'Detalles de sesiones:'
  ]
    .concat(
      sessions.map((session) => {
        return `- ${formatDateEU(session.date)}: ${session.startPercent}% → ${session.endPercent}% = ${session.energyKWh.toFixed(2)} kWh a ${formatCurrency(session.pricePerKWh)} => ${formatCurrency(session.cost)}`
      })
    )
    .join('\n')
}

function App() {
  const [data, setData] = useState<PersistedData>(loadData())
  const [stationName, setStationName] = useState('')
  const [stationLocation, setStationLocation] = useState('')
  const [monthlyTax, setMonthlyTax] = useState(0)
  const [pricingMethod, setPricingMethod] = useState<PricingMethod>('fixed')
  const [unitPricePerKWh, setUnitPricePerKWh] = useState(0)
  const [sessionStationId, setSessionStationId] = useState('')
  const [startPercent, setStartPercent] = useState(0)
  const [endPercent, setEndPercent] = useState(0)
  const [sessionDate, setSessionDate] = useState(todayDate())
  const [sessionPricePerKWh, setSessionPricePerKWh] = useState(0)
  const [includeMonthlyTax, setIncludeMonthlyTax] = useState(true)
  const [reportFrom, setReportFrom] = useState(todayDate())
  const [reportTo, setReportTo] = useState(todayDate())
  const [reportStationId, setReportStationId] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    saveData(data)
  }, [data])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 4000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  const isImportedReport = (value: any): value is { station: ChargingStation; sessions: any[] } => {
    return (
      typeof value === 'object' &&
      value !== null &&
      typeof value.station === 'object' &&
      value.station !== null &&
      typeof value.station.id === 'string' &&
      typeof value.station.name === 'string' &&
      typeof value.station.location === 'string' &&
      typeof value.station.monthlyTax === 'number' &&
      typeof value.station.unitPricePerKWh === 'number' &&
      typeof value.station.pricingMethod === 'string' &&
      Array.isArray(value.sessions)
    )
  }

  const handleImportReport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed = JSON.parse(text)

      if (!isImportedReport(parsed)) {
        alert('Archivo JSON no válido para importación.')
        event.target.value = ''
        return
      }

      const importedStation = parsed.station
      const stationExists = data.stations.some((station) => station.id === importedStation.id)
      const stationId = stationExists ? importedStation.id : uuidv4()
      const mergedStation = stationExists
        ? data.stations.find((station) => station.id === importedStation.id)!
        : { ...importedStation, id: stationId }

      const importedSessions = parsed.sessions.map((session) => {
        const id = typeof session.id === 'string' && !data.sessions.some((existing) => existing.id === session.id)
          ? session.id
          : uuidv4()
        const startPercent = Number(session.startPercent)
        const endPercent = Number(session.endPercent)
        const batteryCapacityKWh = Number(session.batteryCapacityKWh ?? data.settings.batteryCapacityKWh)
        const pricePerKWh = Number(session.pricePerKWh ?? mergedStation.unitPricePerKWh)
        const energyKWh = Number(session.energyKWh ?? calculateKWh(startPercent, endPercent, batteryCapacityKWh))
        const cost = Number(session.cost ?? energyKWh * pricePerKWh)

        return {
          id,
          stationId,
          startPercent,
          endPercent,
          batteryCapacityKWh,
          date: String(session.date),
          pricePerKWh,
          energyKWh,
          cost,
          notes: typeof session.notes === 'string' ? session.notes : undefined
        }
      })

      setData((prev) => ({
        ...prev,
        stations: stationExists ? prev.stations : [...prev.stations, mergedStation],
        sessions: [...prev.sessions, ...importedSessions.filter((session) => !prev.sessions.some((existing) => existing.id === session.id))],
        reports: [
          {
            id: uuidv4(),
            filename: file.name,
            content: text,
            createdAt: new Date().toISOString()
          },
          ...prev.reports
        ]
      }))

      event.target.value = ''
      alert('Informe importado correctamente.')
    } catch (error) {
      console.error(error)
      alert('No se pudo leer el archivo. Asegúrese de seleccionar un JSON válido.')
      event.target.value = ''
    }
  }

  const triggerImport = () => {
    fileInputRef.current?.click()
  }

  const selectedStation = data.stations.find((item) => item.id === sessionStationId)
  const selectedReportStation = data.stations.find((item) => item.id === reportStationId)

  useEffect(() => {
    if (selectedStation && selectedStation.pricingMethod === 'fixed') {
      setSessionPricePerKWh(selectedStation.unitPricePerKWh)
    }
  }, [selectedStation])

  const totalStations = data.stations.length
  const totalSessions = data.sessions.length

  const reportSessions = data.sessions
    .filter((session) => session.stationId === reportStationId)
    .filter((session) => session.date >= reportFrom && session.date <= reportTo)

  const reportMonths = countMonthsInRange(reportFrom, reportTo)
  const reportEnergy = reportSessions.reduce((sum, session) => sum + session.energyKWh, 0)
  const reportCost = reportSessions.reduce((sum, session) => sum + session.cost, 0)
  const reportFixedCost = selectedReportStation && includeMonthlyTax ? selectedReportStation.monthlyTax * reportMonths : 0
  const reportTotalCost = reportCost + reportFixedCost

  const reportText = selectedReportStation
    ? createTextReport(selectedReportStation, reportSessions, includeMonthlyTax, reportMonths)
    : 'Selecciona estación y rango de fechas para ver el reporte.'

  const handleAddStation = () => {
    if (!stationName.trim() || !stationLocation.trim()) return
    const newStation: ChargingStation = {
      id: uuidv4(),
      name: stationName.trim(),
      location: stationLocation.trim(),
      monthlyTax,
      pricingMethod,
      unitPricePerKWh
    }
    setData((prev) => ({ ...prev, stations: [...prev.stations, newStation] }))
    setStationName('')
    setStationLocation('')
    setMonthlyTax(0)
    setPricingMethod('fixed')
    setUnitPricePerKWh(0)
  }

  const handleDeleteStation = (id: string) => {
    setData((prev) => ({
      ...prev,
      stations: prev.stations.filter((station) => station.id !== id),
      sessions: prev.sessions.filter((session) => session.stationId !== id)
    }))
    if (sessionStationId === id) {
      setSessionStationId('')
    }
    if (reportStationId === id) {
      setReportStationId('')
    }
  }

  const handleStartCharge = () => {
    if (!sessionStationId) return
    if (!sessionDate || sessionDate.trim() === '') return
    if (startPercent < 0 || startPercent > 100) return
    const newInProgress: InProgressSession = {
      id: uuidv4(),
      stationId: sessionStationId,
      startPercent,
      date: sessionDate
    }
    setData((prev) => ({ ...prev, inProgressSession: newInProgress }))
    setSuccessMessage(`Carga iniciada: ${data.stations.find((s) => s.id === sessionStationId)?.name} a las ${formatDateEU(sessionDate)}`)
    setStartPercent(0)
    setSessionDate(todayDate())
    setSessionStationId('')
  }

  const handleCompleteCharge = () => {
    if (!data.inProgressSession) return
    if (endPercent < 0 || endPercent > 100) return
    if (endPercent < data.inProgressSession.startPercent) {
      alert('El nivel final debe ser mayor o igual al nivel inicial')
      return
    }
    const station = data.stations.find((s) => s.id === data.inProgressSession!.stationId)
    if (!station) return
    const capacity = data.settings.batteryCapacityKWh
    const energyKWh = calculateKWh(data.inProgressSession.startPercent, endPercent, capacity)
    const pricePerKWh = station.pricingMethod === 'fixed' ? station.unitPricePerKWh : sessionPricePerKWh
    const cost = energyKWh * pricePerKWh
    const newSession: ChargeSession = {
      id: data.inProgressSession.id,
      stationId: data.inProgressSession.stationId,
      startPercent: data.inProgressSession.startPercent,
      endPercent,
      batteryCapacityKWh: capacity,
      date: data.inProgressSession.date,
      pricePerKWh,
      energyKWh,
      cost
    }
    setData((prev) => ({
      ...prev,
      sessions: [...prev.sessions, newSession],
      inProgressSession: null
    }))
    setSuccessMessage(`✓ Carga registrada: ${energyKWh.toFixed(2)} kWh por ${formatCurrency(cost)}`)
    setEndPercent(0)
    setSessionPricePerKWh(0)
  }

  const handleCancelCharge = () => {
    setData((prev) => ({ ...prev, inProgressSession: null }))
    setEndPercent(0)
    setSessionPricePerKWh(0)
  }

  const saveReportFile = async (format: 'txt' | 'json') => {
    if (!selectedReportStation) return
    const filename = `reporte-${selectedReportStation.name}-${reportFrom}-a-${reportTo}.${format}`
    const content = format === 'json'
      ? JSON.stringify({ station: selectedReportStation, sessions: reportSessions, includeMonthlyTax, reportMonths, totalKWh: reportEnergy, totalCost: reportTotalCost }, null, 2)
      : reportText
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/plain' })
    const reportFile: ReportFile = {
      id: uuidv4(),
      filename,
      content,
      createdAt: new Date().toISOString()
    }

    try {
      if ('showSaveFilePicker' in window) {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: 'Informe', accept: { 'text/plain': ['.txt'], 'application/json': ['.json'] } }]
        })
        const writable = await handle.createWritable()
        await writable.write(blob)
        await writable.close()
      } else {
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        link.remove()
        URL.revokeObjectURL(url)
      }
    } catch (error) {
      console.error('Error saving report file', error)
    }

    setData((prev) => ({ ...prev, reports: [reportFile, ...prev.reports] }))
  }

  const downloadReport = (report: ReportFile) => {
    const blob = new Blob([report.content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = report.filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="app-shell">
      <header>
        <h1>App Car Energy</h1>
        <span className="version">v{data.version}</span>
      </header>

      {successMessage && <div className="success-message">{successMessage}</div>}

      <section className="panel">
        <h2>Configuración general</h2>
        <div className="form-row">
          <label>
            Capacidad de batería (kWh)
            <input
              type="number"
              value={data.settings.batteryCapacityKWh}
              onChange={(e) => {
                const value = Number(e.target.value)
                setData((prev) => ({
                  ...prev,
                  settings: { ...prev.settings, batteryCapacityKWh: value }
                }))
              }}
              min={1}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <h2>Estaciones de carga</h2>
        <div className="form-row">
          <label>
            Nombre
            <input value={stationName} onChange={(e) => setStationName(e.target.value)} />
          </label>
          <label>
            Ubicación
            <input value={stationLocation} onChange={(e) => setStationLocation(e.target.value)} />
          </label>
        </div>
        <div className="form-row">
          <label>
            Coste mensual fijo (€)
            <input type="number" value={monthlyTax} onChange={(e) => setMonthlyTax(Number(e.target.value))} />
          </label>
          <label>
            Método de precio
            <select value={pricingMethod} onChange={(e) => setPricingMethod(e.target.value as PricingMethod)}>
              <option value="fixed">Fijo</option>
              <option value="variable">Variable</option>
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>
            Precio por kWh (€)
            <input type="number" value={unitPricePerKWh} onChange={(e) => setUnitPricePerKWh(Number(e.target.value))} />
          </label>
        </div>
        <button onClick={handleAddStation}>Añadir estación</button>

        <ul className="station-list">
          {data.stations.map((station) => (
            <li key={station.id}>
              <div>
                <strong>{station.name}</strong> • {station.location}
                <div>{station.pricingMethod} • {formatCurrency(station.unitPricePerKWh)} / kWh • {formatCurrency(station.monthlyTax)} mensual</div>
              </div>
              <button onClick={() => handleDeleteStation(station.id)}>Eliminar</button>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel">
        <h2>{data.inProgressSession ? 'Completar carga' : 'Iniciar carga'}</h2>
        {!data.inProgressSession ? (
          <>
            <div className="form-row">
              <label>
                Estación
                <select value={sessionStationId} onChange={(e) => setSessionStationId(e.target.value)}>
                  <option value="">Selecciona estación</option>
                  {data.stations.map((station) => (
                    <option key={station.id} value={station.id}>{station.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Fecha de carga (DD/MM/AAAA)
                <input
                  type="text"
                  placeholder="DD/MM/AAAA"
                  value={sessionDate ? formatDateEU(sessionDate) : ''}
                  onChange={(e) => {
                    const parsed = parseEUDate(e.target.value)
                    if (parsed) {
                      setSessionDate(parsed)
                    }
                  }}
                />
              </label>
            </div>
            <label>
              Nivel inicial (%)
              <input type="number" value={startPercent} onChange={(e) => setStartPercent(Number(e.target.value))} min={0} max={100} />
            </label>
            <button onClick={handleStartCharge}>Guardar e iniciar carga</button>
          </>
        ) : (
          <>
            <div className="form-row">
              <label>
                Estación
                <input type="text" value={data.stations.find((s) => s.id === data.inProgressSession!.stationId)?.name || ''} disabled />
              </label>
              <label>
                Fecha
                <input type="text" value={formatDateEU(data.inProgressSession.date)} disabled />
              </label>
            </div>
            <label>
              Nivel inicial
              <input type="number" value={data.inProgressSession.startPercent} disabled />
            </label>
            <label>
              Nivel final (%)
              <input type="number" value={endPercent} onChange={(e) => setEndPercent(Number(e.target.value))} min={0} max={100} />
            </label>
            {data.stations.find((s) => s.id === data.inProgressSession!.stationId)?.pricingMethod === 'variable' && (
              <label>
                Precio por kWh (€)
                <input type="number" value={sessionPricePerKWh} onChange={(e) => setSessionPricePerKWh(Number(e.target.value))} />
              </label>
            )}
            <div className="form-row">
              <button onClick={handleCompleteCharge}>Confirmar y guardar carga</button>
              <button onClick={handleCancelCharge} style={{ background: '#dc2626' }}>Cancelar</button>
            </div>
          </>
        )}
      </section>

      <section className="panel">
        <h2>Historial de cargas</h2>
        {data.sessions.length === 0 ? (
          <p style={{ color: '#999' }}>No hay cargas registradas</p>
        ) : (
          <ul className="station-list">
            {[...data.sessions].reverse().map((session) => {
              const station = data.stations.find((s) => s.id === session.stationId)
              return (
                <li key={session.id}>
                  <div>
                    <strong>{station?.name || 'Estación desconocida'}</strong>
                    <div>{formatDateEU(session.date)}: {session.startPercent}% → {session.endPercent}% = {session.energyKWh.toFixed(2)} kWh</div>
                    <div>{formatCurrency(session.cost)}</div>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      <section className="panel">
        <h2>Reporte</h2>
        <div className="form-row">
          <label>
            Desde (DD/MM/AAAA)
            <input
              type="text"
              placeholder="DD/MM/AAAA"
              value={reportFrom ? formatDateEU(reportFrom) : ''}
              onChange={(e) => {
                const parsed = parseEUDate(e.target.value)
                if (parsed) {
                  setReportFrom(parsed)
                }
              }}
            />
          </label>
          <label>
            Hasta (DD/MM/AAAA)
            <input
              type="text"
              placeholder="DD/MM/AAAA"
              value={reportTo ? formatDateEU(reportTo) : ''}
              onChange={(e) => {
                const parsed = parseEUDate(e.target.value)
                if (parsed) {
                  setReportTo(parsed)
                }
              }}
            />
          </label>
        </div>
        <label>
          Estación
          <select value={reportStationId} onChange={(e) => setReportStationId(e.target.value)}>
            <option value="">Selecciona estación</option>
            {data.stations.map((station) => (
              <option key={station.id} value={station.id}>{station.name}</option>
            ))}
          </select>
        </label>
        <label className="checkbox-row">
          <input type="checkbox" checked={includeMonthlyTax} onChange={(e) => setIncludeMonthlyTax(e.target.checked)} />
          Incluir coste mensual
        </label>
        <div className="report-summary">
          <p>KWh totales: {reportEnergy.toFixed(2)}</p>
          <p>Coste energía: {formatCurrency(reportCost)}</p>
          <p>Coste mensual total: {formatCurrency(reportFixedCost)}</p>
          <p>Coste final: {formatCurrency(reportTotalCost)}</p>
        </div>
        <div className="report-actions">
          <button disabled={!selectedReportStation} onClick={() => saveReportFile('txt')}>Exportar TXT</button>
          <button disabled={!selectedReportStation} onClick={() => saveReportFile('json')}>Exportar JSON</button>
          <button disabled={!selectedReportStation} onClick={triggerImport}>Importar JSON</button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            style={{ display: 'none' }}
            onChange={handleImportReport}
          />
        </div>
        <pre className="report-output">{reportText}</pre>
      </section>

      <section className="panel">
        <h2>Informes guardados</h2>
        <ul className="station-list">
          {data.reports.map((report) => (
            <li key={report.id}>
              <div>
                <strong>{report.filename}</strong>
                <div>{new Date(report.createdAt).toLocaleString()}</div>
              </div>
              <button onClick={() => downloadReport(report)}>Descargar</button>
            </li>
          ))}
        </ul>
      </section>

      <footer>
        <span>Sesiones guardadas: {totalSessions}</span>
        <span>Estaciones guardadas: {totalStations}</span>
      </footer>
    </div>
  )
}

export default App
