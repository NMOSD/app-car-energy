import { useState, useCallback } from 'react'
import { usePersistedData } from './hooks/usePersistedData'
import { Header } from './components/Header'
import { SuccessMessage } from './components/SuccessMessage'
import { Settings } from './components/Settings'
import { StationManager } from './components/StationManager'
import { ChargingFlow } from './components/ChargingFlow'
import { SessionHistory } from './components/SessionHistory'
import { ReportGenerator } from './components/ReportGenerator'
import { SavedReports } from './components/SavedReports'

type Tab = 'charge' | 'stations' | 'history' | 'report' | 'settings'

function App() {
  const {
    data, addStation, updateStation, deleteStation,
    startCharge, completeCharge, cancelCharge,
    updateSession, deleteSession, updateSettings,
    addReport, deleteReport
  } = usePersistedData()

  const [tab, setTab] = useState<Tab>(data.inProgressSession ? 'charge' : 'charge')
  const [successMessage, setSuccessMessage] = useState('')

  const showSuccess = useCallback((msg: string) => setSuccessMessage(msg), [])
  const clearSuccess = useCallback(() => setSuccessMessage(''), [])

  return (
    <div className="app-shell">
      <Header />
      <SuccessMessage message={successMessage} onClear={clearSuccess} />

      <nav className="tab-bar">
        <button className={tab === 'charge' ? 'tab active' : 'tab'} onClick={() => setTab('charge')}>Cargar</button>
        <button className={tab === 'stations' ? 'tab active' : 'tab'} onClick={() => setTab('stations')}>Estaciones</button>
        <button className={tab === 'history' ? 'tab active' : 'tab'} onClick={() => setTab('history')}>Historial</button>
        <button className={tab === 'report' ? 'tab active' : 'tab'} onClick={() => setTab('report')}>Reporte</button>
        <button className={tab === 'settings' ? 'tab active' : 'tab'} onClick={() => setTab('settings')}>Config</button>
      </nav>

      {tab === 'charge' && (
        <ChargingFlow
          stations={data.stations}
          inProgressSession={data.inProgressSession}
          batteryCapacityKWh={data.settings.batteryCapacityKWh}
          onStartCharge={startCharge}
          onCompleteCharge={completeCharge}
          onCancelCharge={cancelCharge}
          onSuccess={showSuccess}
        />
      )}

      {tab === 'stations' && (
        <StationManager
          stations={data.stations}
          onAdd={addStation}
          onUpdate={updateStation}
          onDelete={deleteStation}
        />
      )}

      {tab === 'history' && (
        <SessionHistory
          sessions={data.sessions}
          stations={data.stations}
          onUpdate={updateSession}
          onDelete={deleteSession}
        />
      )}

      {tab === 'report' && (
        <>
          <ReportGenerator
            stations={data.stations}
            sessions={data.sessions}
            onAddReport={addReport}
            onSuccess={showSuccess}
          />
          <SavedReports reports={data.reports} onDelete={deleteReport} />
        </>
      )}

      {tab === 'settings' && (
        <Settings
          batteryCapacityKWh={data.settings.batteryCapacityKWh}
          onUpdate={updateSettings}
        />
      )}

      <footer>
        <span>{data.sessions.length} sesiones</span>
        <span>{data.stations.length} estaciones</span>
      </footer>
    </div>
  )
}

export default App
