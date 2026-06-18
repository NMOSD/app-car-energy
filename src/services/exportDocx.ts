import { Document, Packer, Paragraph, Table, TableRow, TableCell, TextRun, WidthType, HeadingLevel, AlignmentType, BorderStyle } from 'docx'
import { ChargingStation, ChargeSession } from '../types'
import { formatCurrency, formatDateEU } from '../utils'

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
}

function cell(text: string, bold = false) {
  return new TableCell({
    borders: noBorders,
    children: [new Paragraph({ children: [new TextRun({ text, bold, size: 20 })] })]
  })
}

export async function generateReportDocx(
  station: ChargingStation,
  sessions: ChargeSession[],
  includeMonthlyTax: boolean,
  months: number,
  totalKWh: number,
  totalEnergyCost: number,
  totalCost: number
): Promise<Blob> {
  const dateRange = sessions.length
    ? `${formatDateEU(sessions[0].date)} a ${formatDateEU(sessions[sessions.length - 1].date)}`
    : 'Sin sesiones'

  const headerRow = new TableRow({
    children: ['Fecha', 'Inicio %', 'Final %', 'kWh', 'EUR/kWh', 'Coste'].map(t => cell(t, true))
  })

  const dataRows = sessions.map(s => new TableRow({
    children: [
      cell(formatDateEU(s.date)),
      cell(`${s.startPercent}`),
      cell(`${s.endPercent}`),
      cell(s.energyKWh.toFixed(2)),
      cell(s.pricePerKWh.toFixed(4)),
      cell(formatCurrency(s.cost))
    ]
  }))

  const doc = new Document({
    sections: [{
      children: [
        new Paragraph({ text: `Reporte de carga - ${station.name}`, heading: HeadingLevel.HEADING_1 }),
        new Paragraph({ children: [new TextRun({ text: `Ubicacion: ${station.location}`, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Periodo: ${dateRange}`, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Metodo: ${station.pricingMethod === 'fixed' ? 'Fijo' : 'Variable (PVPC)'}`, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Incluye coste mensual: ${includeMonthlyTax ? 'Si' : 'No'}`, size: 22 })] }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: 'Resumen', heading: HeadingLevel.HEADING_2 }),
        new Paragraph({ children: [new TextRun({ text: `kWh total: ${totalKWh.toFixed(2)}`, size: 22 })] }),
        new Paragraph({ children: [new TextRun({ text: `Coste de energia: ${formatCurrency(totalEnergyCost)}`, size: 22 })] }),
        ...(includeMonthlyTax ? [new Paragraph({ children: [new TextRun({ text: `Coste fijo mensual: ${formatCurrency(station.monthlyTax * months)}`, size: 22 })] })] : []),
        new Paragraph({ children: [new TextRun({ text: `Coste total: ${formatCurrency(totalCost)}`, bold: true, size: 24 })] }),
        new Paragraph({ text: '' }),
        new Paragraph({ text: 'Detalle de sesiones', heading: HeadingLevel.HEADING_2 }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [headerRow, ...dataRows]
        })
      ]
    }]
  })

  return await Packer.toBlob(doc)
}
