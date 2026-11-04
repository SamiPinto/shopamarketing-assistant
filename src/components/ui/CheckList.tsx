import { ChevronDown } from 'lucide-react'
import type { Check } from '../../types/analysis'
import { StatusBadge, StatusIcon } from './StatusBadge'

interface CheckListProps {
  checks: Check[]
  /** Show "Why this matters" disclosures. */
  explain?: boolean
  dense?: boolean
}

export function CheckList({ checks, explain = true, dense = false }: CheckListProps) {
  return (
    <ul className={`check-list${dense ? ' check-list--dense' : ''}`}>
      {checks.map((check) => (
        <li key={check.id} className="check-row">
          <StatusIcon status={check.status} />
          <div className="check-row__body">
            <div className="check-row__head">
              <span className="check-row__label">{check.label}</span>
              {!dense && <StatusBadge kind="check" status={check.status} compact />}
            </div>
            <p className="check-row__detail">{check.detail}</p>
            {explain && (
              <details className="why">
                <summary>
                  Why this matters
                  <ChevronDown size={13} aria-hidden="true" className="why__chevron" />
                </summary>
                <p>{check.why}</p>
              </details>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
