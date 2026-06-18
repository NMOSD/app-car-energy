import jsPDF from 'jspdf'
import { ChargingStation, ChargeSession } from '../types'
import { formatCurrency, formatDateEU } from '../utils'

export function generateReportPdf(
  station: ChargingStation,
  sessions: ChargeSession[],
  includeMonthlyTax: boolean,
  months: number,
  totalKWh: number,
  totalEnergyCost: number,
  totalCost: number
): Blob {
  const doc = new jsPDF()
  const margin = 20
  let y = margin

  doc.setFontSize(16)
  doc.text(`Reporte de carga - ${station.name}`, margin, y)
  y += 10

  doc.setFontSize(10)
  doc.text(`Ubicacion: ${station.location}`, margin, y)
  y += 6
  const dateRange = sessions.length
    ? `${formatDateEU(sessions[0].date)} a ${formatDateEU(sessions[sessions.length - 1].date)}`
    : 'Sin sesiones'
  doc.text(`Periodo: ${dateRange}`, margin, y)
  y += 6
  doc.text(`Metodo de precio: ${station.pricingMethod === 'fixed' ? 'Fijo' : 'Variable (PVPC)'}`, margin, y)
  y += 6
  doc.text(`Incluye coste mensual: ${includeMonthlyTax ? 'Si' : 'No'}`, margin, y)
  y += 6
  doc.text(`Meses en rango: ${months}`, margin, y)
  y += 10

  doc.setFontSize(12)
  doc.text('Resumen', margin, y)
  y += 7
  doc.setFontSize(10)
  doc.text(`kWh total: ${totalKWh.toFixed(2)}`, margin, y)
  y += 6
  doc.text(`Coste de energia: ${formatCurrency(totalEnergyCost)}`, margin, y)
  y += 6
  if (includeMonthlyTax) {
    doc.text(`Coste fijo mensual: ${formatCurrency(station.monthlyTax * months)}`, margin, y)
    y += 6
  }
  doc.text(`Coste total: ${formatCurrency(totalCost)}`, margin, y)
  y += 12

  doc.setFontSize(12)
  doc.text('Detalle de sesiones', margin, y)
  y += 8

  doc.setFontSize(9)
  const colX = [margin, margin + 28, margin + 55, margin + 82, margin + 110, margin + 140]
  doc.setFont('helvetica', 'bold')
  doc.text('Fecha', colX[0], y)
  doc.text('Inicio %', colX[1], y)
  doc.text('Final %', colX[2], y)
  doc.text('kWh', colX[3], y)
  doc.text('EUR/kWh', colX[4], y)
  doc.text('Coste', colX[5], y)
  doc.setFont('helvetica', 'normal')
  y += 5

  for (const session of sessions) {
    if (y > 270) {
      doc.addPage()
      y = margin
    }
    doc.text(formatDateEU(session.date), colX[0], y)
    doc.text(`${session.startPercent}`, colX[1], y)
    doc.text(`${session.endPercent}`, colX[2], y)
    doc.text(session.energyKWh.toFixed(2), colX[3], y)
    doc.text(session.pricePerKWh.toFixed(4), colX[4], y)
    doc.text(formatCurrency(session.cost), colX[5], y)
    y += 5
  }

  return doc.output('blob')
}
