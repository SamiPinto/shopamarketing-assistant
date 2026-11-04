import { Check } from 'lucide-react'

interface Props {
  steps: readonly string[]
  current: number
  domain?: string
}

/** Progress reflects real pipeline stages; nothing is artificially delayed. */
export function ScanProgress({ steps, current, domain }: Props) {
  return (
    <div className="scan" role="status" aria-live="polite">
      <div className="scan__radar" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <p className="scan__title">Analysing{domain ? ` ${domain}` : ''}</p>
      <ol className="scan__steps">
        {steps.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'active' : 'pending'
          return (
            <li key={label} className={`scan__step scan__step--${state}`}>
              <span className="scan__marker" aria-hidden="true">
                {state === 'done' ? <Check size={11} strokeWidth={3} /> : null}
              </span>
              <span>{label}</span>
              <span className="sr-only">{state === 'done' ? 'complete' : state === 'active' ? 'in progress' : 'pending'}</span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
