import type { ServiceFit } from '../../types/analysis'
import { SERVICE_DESCRIPTIONS } from '../../services/analysis/serviceFit'

export function ServiceFitList({ services, compact }: { services: ServiceFit[]; compact?: boolean }) {
  if (services.length === 0) {
    return <p className="muted-text">No service showed a clear potential fit from the signals on this page.</p>
  }
  return (
    <ul className={`service-list${compact ? ' service-list--compact' : ''}`}>
      {services.map((s) => (
        <li key={s.service} className="service">
          <div className="service__head">
            <span className="service__name">{s.label}</span>
            <span className={`service__strength service__strength--${s.strength}`}>
              {s.strength === 'strong-signal' ? 'Strong signal' : 'Worth exploring'}
            </span>
          </div>
          {!compact && <p className="service__area">{SERVICE_DESCRIPTIONS[s.service]}</p>}
          <p className="service__reason">{s.reason}</p>
          {!compact && s.signals.length > 0 && (
            <ul className="service__signals">
              {s.signals.map((signal) => (
                <li key={signal}>{signal}</li>
              ))}
            </ul>
          )}
        </li>
      ))}
    </ul>
  )
}
