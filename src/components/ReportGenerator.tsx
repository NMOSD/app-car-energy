import { useState } from 'react'
import { ChargeSession, ChargingStation, ReportFile } from '../types'
import { formatCurrency, formatDateEU, parseEUDate, todayDate, countMonthsInRange } from '../utils'
import { saveWithPicker, shareReport } from '../services/exportShare'
import { v4 as uuidv4 } from 'uuid'

interface Props {
  stations: ChargingStation[]
  sessions: ChargeSession[]
  onAddReport: (report: ReportFile) => void
  onSuccess: (message: string) => void
}

function createTextReport(station: ChargingStation, sessions: ChargeSession[], includeMonthlyTax: boolean, months: number) {
  const totalKWh = sessions.reduce((sum, s) => sum + s.energyKWh, 0)
  const totalCost = sessions.reduce((sum, s) => sum + s.cost, 0)
  const fixedCost = includeMonthlyTax ? station.monthlyTax * months : 0
  return [
    `Reporte de carga - ${station.name}`,
    `Ubicacion: ${station.location}`,
    `Periodo: ${sessions.length ? formatDateEU(sessions[0].date) : ''} a ${sessions.length ? formatDateEU(sessions[sessions.length - 1].date) : ''}`,
    `Incluye coste mensual: ${includeMonthlyTax ? 'Si' : 'No'}`,
    `Meses en rango: ${months}`,
    `kWh total: ${totalKWh.toFixed(2)}`,
    `Coste de energia: ${formatCurrency(totalCost)}`,
    `Coste fijo total: ${formatCurrency(fixedCost)}`,
    `Coste total: ${formatCurrency(totalCost + fixedCost)}`,
    '',
    'Detalle de sesiones:'
  ].concat(
    sessions.map(s =>
      `- ${formatDateEU(s.date)}: ${s.startPercent}% -> ${s.endPercent}% = ${s.energyKWh.toFixed(2)} kWh a ${formatCurrency(s.pricePerKWh)} => ${formatCurrency(s.cost)}`
    )
  ).join('\n')
}

export function ReportGenerator({ stations, sessions, onAddReport, onSuccess }: Props) {
  const [fromInput, setFromInput] = useState(formatDateEU(todayDate()))
  const [toInput, setToInput] = useState(formatDateEU(todayDate()))
  const [stationId, setStationId] = useState('')
  const [includeMonthlyTax, setIncludeMonthlyTax] = useState(true)
  const [exporting, setExporting] = useState(false)

  const fromDate = parseEUDate(fromInput)
  const toDate = parseEUDate(toInput)
  const station = stations.find(s => s.id === stationId)

  const filtered = fromDate && toDate
    ? sessions.filter(s => s.stationId === stationId && s.date >= fromDate && s.date <= toDate)
    : []

  const months = fromDate && toDate ? countMonthsInRange(fromDate, toDate) : 0
  const totalKWh = filtered.reduce((sum, s) => sum + s.energyKWh, 0)
  const totalEnergyCost = filtered.reduce((sum, s) => sum + s.cost, 0)
  const fixedCost = station && includeMonthlyTax ? station.monthlyTax * months : 0
  const totalCost = totalEnergyCost + fixedCost

  let avgKwhPer100km: number | null = null
  let avgEurPer100km: number | null = null
  const sessionsWithKm = filtered.filter(s => s.mileageKm != null)
  if (sessionsWithKm.length >= 2) {
    const first = sessionsWithKm[0]
    const last = sessionsWithKm[sessionsWithKm.length - 1]
    const kmDelta = last.mileageKm! - first.mileageKm!
    if (kmDelta > 0) {
      const totalKWhInRange = sessionsWithKm.slice(1).reduce((sum, s) => sum + s.energyKWh, 0)
      const totalCostInRange = sessionsWithKm.slice(1).reduce((sum, s) => sum + s.cost, 0)
      avgKwhPer100km = (totalKWhInRange / kmDelta) * 100
      avgEurPer100km = (totalCostInRange / kmDelta) * 100
    }
  }

  const reportText = station
    ? createTextReport(station, filtered, includeMonthlyTax, months)
    : 'Selecciona estacion y rango de fechas para ver el reporte.'

  const baseFilename = station
    ? `reporte-${station.name}-${fromDate || ''}-a-${toDate || ''}`
    : 'reporte'

  const handleExport = async (format: 'txt' | 'json' | 'pdf' | 'docx' | 'email') => {
    if (!station) return
    setExporting(true)
    try {
      let blob: Blob
      let filename: string

      switch (format) {
        case 'pdf': {
          const { generateReportPdf } = await import('../services/exportPdf')
          blob = generateReportPdf(station, filtered, includeMonthlyTax, months, totalKWh, totalEnergyCost, totalCost)
          filename = `${baseFilename}.pdf`
          break
        }
        case 'docx': {
          const { generateReportDocx } = await import('../services/exportDocx')
          blob = await generateReportDocx(station, filtered, includeMonthlyTax, months, totalKWh, totalEnergyCost, totalCost)
          filename = `${baseFilename}.docx`
          break
        }
        case 'json': {
          const content = JSON.stringify({ station, sessions: filtered, includeMonthlyTax, months, totalKWh, totalCost }, null, 2)
          blob = new Blob([content], { type: 'application/json' })
          filename = `${baseFilename}.json`
          break
        }
        case 'email': {
          const { generateReportPdf: genPdf } = await import('../services/exportPdf')
          const pdfBlob = genPdf(station, filtered, includeMonthlyTax, months, totalKWh, totalEnergyCost, totalCost)
          await shareReport(pdfBlob, `${baseFilename}.pdf`, `Reporte de carga - ${station.name}`)
          setExporting(false)
          return
        }
        default: {
          blob = new Blob([reportText], { type: 'text/plain' })
          filename = `${baseFilename}.txt`
        }
      }

      const saved = await saveWithPicker(blob, filename)
      if (saved) {
        const reportFile: ReportFile = {
          id: uuidv4(),
          filename,
          content: format === 'json' || format === 'txt' ? reportText : `[${format.toUpperCase()} generado]`,
          format: format as ReportFile['format'],
          createdAt: new Date().toISOString()
        }
        onAddReport(reportFile)
        onSuccess(`Reporte exportado: ${filename}`)
      }
    } catch (err) {
      console.error('Export error', err)
      alert('Error al exportar el reporte.')
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="panel">
      <h2>Reporte</h2>
      <div className="form-row">
        <label>
          Desde (DD/MM/AAAA)
          <input type="text" placeholder="DD/MM/AAAA" value={fromInput} onChange={e => setFromInput(e.target.value)} />
        </label>
        <label>
          Hasta (DD/MM/AAAA)
          <input type="text" placeholder="DD/MM/AAAA" value={toInput} onChange={e => setToInput(e.target.value)} />
        </label>
      </div>
      <div className="form-row">
        <label>
          Estacion
          <select value={stationId} onChange={e => setStationId(e.target.value)}>
            <option value="">Selecciona estacion</option>
            {stations.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
      </div>
      <label className="checkbox-row">
        <input type="checkbox" checked={includeMonthlyTax} onChange={e => setIncludeMonthlyTax(e.target.checked)} />
        Incluir coste mensual
      </label>

      <div className="report-summary">
        <p>kWh totales: <strong>{totalKWh.toFixed(2)}</strong></p>
        <p>Coste energia: <strong>{formatCurrency(totalEnergyCost)}</strong></p>
        <p>Coste mensual total: <strong>{formatCurrency(fixedCost)}</strong></p>
        <p>Coste final: <strong>{formatCurrency(totalCost)}</strong></p>
        {avgKwhPer100km !== null && (
          <>
            <p>Consumo medio: <strong>{avgKwhPer100km.toFixed(1)} kWh/100km</strong></p>
            <p>Coste medio: <strong>{formatCurrency(avgEurPer100km!)}/100km</strong></p>
          </>
        )}
      </div>

      <div className="export-actions">
        <button disabled={!station || exporting} onClick={() => handleExport('pdf')}>Exportar PDF</button>
        <button disabled={!station || exporting} onClick={() => handleExport('docx')}>Exportar Word</button>
        <button disabled={!station || exporting} onClick={() => handleExport('json')}>Exportar JSON</button>
        <button disabled={!station || exporting} onClick={() => handleExport('txt')}>Exportar TXT</button>
        <button disabled={!station || exporting} onClick={() => handleExport('email')}>Enviar por email</button>
      </div>

      <pre className="report-output">{reportText}</pre>
    </section>
  )
}
