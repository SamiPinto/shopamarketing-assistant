import { Check, Minus } from 'lucide-react'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import type { CtaIntent, PageExtraction } from '../../types/page'
import { CategoryDetail } from '../overview/CategoryDetail'

interface Signal {
  label: string
  detected: (page: PageExtraction) => boolean
}

const has = (intent: CtaIntent) => (page: PageExtraction) => page.ctas.some((c) => c.intent === intent)

const SIGNALS: Signal[] = [
  { label: 'Phone', detected: (p) => p.phones.length > 0 },
  { label: 'Email', detected: (p) => p.emails.length > 0 },
  { label: 'Forms', detected: (p) => p.forms.count > 0 && !p.forms.searchOnly },
  { label: 'Book', detected: has('book') },
  { label: 'Contact', detected: has('contact') },
  { label: 'Quote', detected: has('quote') },
  { label: 'Get Started', detected: has('start') },
  { label: 'Enquire', detected: has('enquire') },
  { label: 'Call Now', detected: has('call') },
  { label: 'Shop Now', detected: has('shop') },
  { label: 'Learn More', detected: has('learn') },
  { label: 'Apply', detected: has('apply') },
]

export default function ConversionModule({ analysis }: ModuleProps) {
  const { page } = analysis
  const detectedCount = SIGNALS.filter((s) => s.detected(page)).length

  return (
    <CategoryDetail
      analysis={analysis}
      id="conversion"
      description="How clearly the page turns visitors into enquiries: calls-to-action, contact paths and forms."
    >
      <section className="panel" aria-labelledby="conv-signals">
        <div className="panel__head">
          <h2 id="conv-signals" className="panel__title">
            Conversion signals detected
          </h2>
          <span className="panel__note">
            {detectedCount} of {SIGNALS.length}
          </span>
        </div>
        <ul className="signal-grid">
          {SIGNALS.map((s) => {
            const on = s.detected(page)
            return (
              <li key={s.label} className={`signal-chip${on ? ' signal-chip--on' : ''}`}>
                {on ? <Check size={13} strokeWidth={2.5} aria-hidden="true" /> : <Minus size={13} aria-hidden="true" />}
                <span>{s.label}</span>
                <span className="sr-only">{on ? 'detected' : 'not detected'}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {page.ctas.length > 0 && (
        <section className="panel" aria-labelledby="cta-table">
          <h2 id="cta-table" className="panel__title">
            Calls-to-action found
          </h2>
          <table className="data-table">
            <thead>
              <tr>
                <th scope="col">Text</th>
                <th scope="col">Intent</th>
                <th scope="col">Element</th>
                <th scope="col">First screen</th>
              </tr>
            </thead>
            <tbody>
              {page.ctas.map((c) => (
                <tr key={c.text}>
                  <td>“{c.text}”</td>
                  <td className="capitalize">{c.intent}</td>
                  <td className="capitalize">{c.element}</td>
                  <td>{c.aboveFold ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </CategoryDetail>
  )
}
