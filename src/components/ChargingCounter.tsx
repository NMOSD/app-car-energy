import { useState, useEffect } from 'react'
import { estimateChargeMinutes, formatDuration } from '../utils'

interface Props {
  startPercent: number
  startTime: string
  batteryCapacityKWh: number
  chargingSpeedKWh: number
}

export function ChargingCounter({ startPercent, startTime, batteryCapacityKWh, chargingSpeedKWh }: Props) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const elapsedMs = now - new Date(startTime).getTime()
  const elapsedHours = Math.max(0, elapsedMs / 3600000)
  const estimatedPercent = Math.min(100, startPercent + (elapsedHours * chargingSpeedKWh / batteryCapacityKWh * 100))
  const elapsedMinutes = Math.max(0, elapsedMs / 60000)

  const targets = [80, 90, 100].filter(t => t > startPercent)
  const timeToTarget = (target: number) => {
    const remaining = estimateChargeMinutes(estimatedPercent, target, batteryCapacityKWh, chargingSpeedKWh)
    return remaining > 0 ? formatDuration(remaining) : 'Alcanzado'
  }

  const progressWidth = Math.min(100, Math.max(0, estimatedPercent))

  return (
    <div className="charging-counter">
      <div className="counter-percent">{estimatedPercent.toFixed(1)}%</div>
      <div className="counter-bar">
        <div className="counter-bar-fill" style={{ width: `${progressWidth}%` }} />
      </div>
      <div className="counter-elapsed">Tiempo transcurrido: {formatDuration(elapsedMinutes)}</div>
      <div className="counter-targets">
        {targets.map(t => (
          <div key={t} className="counter-target">
            <span className="target-label">Al {t}%:</span>
            <span className="target-time">{timeToTarget(t)}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
