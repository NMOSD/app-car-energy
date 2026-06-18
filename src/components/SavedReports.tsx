import { ReportFile } from '../types'

interface Props {
  reports: ReportFile[]
  onDelete: (id: string) => void
}

export function SavedReports({ reports, onDelete }: Props) {
  const handleDownload = (report: ReportFile) => {
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

  const handleDelete = (id: string) => {
    if (confirm('Eliminar este informe guardado?')) {
      onDelete(id)
    }
  }

  if (reports.length === 0) return null

  return (
    <section className="panel">
      <h2>Informes guardados</h2>
      <ul className="station-list">
        {reports.map(report => (
          <li key={report.id}>
            <div>
              <strong>{report.filename}</strong>
              <div className="report-meta">
                {report.format.toUpperCase()} &bull; {new Date(report.createdAt).toLocaleString()}
              </div>
            </div>
            <div className="btn-group">
              {(report.format === 'txt' || report.format === 'json') && (
                <button className="btn-small" onClick={() => handleDownload(report)}>Descargar</button>
              )}
              <button className="btn-small btn-danger" onClick={() => handleDelete(report.id)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
