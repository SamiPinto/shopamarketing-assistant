import type { ReactNode } from 'react'
import { CircleCheck, CircleHelp, CircleX, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { CheckStatus } from '../../types/analysis'
import type { OpportunityReport } from '../../types/misc'
import { BrandLogo } from '../ui/Primitives'

const STATUS_ICON: Record<CheckStatus, LucideIcon> = {
  good: CircleCheck,
  attention: TriangleAlert,
  'not-detected': CircleX,
  unknown: CircleHelp,
}

interface Props {
  report: OpportunityReport
  /** Extra content shown at the end of a section, keyed by section id (e.g. SEO rankings). */
  extras?: Partial<Record<string, ReactNode>>
}

export function ReportDocument({ report, extras = {} }: Props) {
  return (
    <article className="report-document" aria-label="Opportunity report">
      <header className="report-document__masthead">
        <BrandLogo width={120} />
        <span className="report-document__classification">Internal research</span>
      </header>

      <h1 className="report-document__title">{report.title}</h1>
      <dl className="report-document__meta">
        <div>
          <dt>Business</dt>
          <dd>{report.business}</dd>
        </div>
        <div>
          <dt>Website</dt>
          <dd className="mono">{report.website}</dd>
        </div>
        <div>
          <dt>Analysis date</dt>
          <dd>{report.analysisDate}</dd>
        </div>
      </dl>

      {report.sections.map((section, index) => (
        <section key={section.id} className="report-document__section">
          <h2>
            <span className="report-document__num">{String(index + 1).padStart(2, '0')}</span>
            {section.title}
          </h2>
          {section.paragraphs?.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {section.items && section.items.length > 0 && (
            <ul className="report-items">
              {section.items.map((item) => {
                const Icon = item.status ? STATUS_ICON[item.status] : null
                const tone = item.status === 'attention' || item.status === 'not-detected' ? 'bad' : item.status ?? 'plain'
                return (
                  <li key={item.label} className={`report-item report-item--${tone}`}>
                    {Icon ? <Icon size={15} aria-hidden="true" className="report-item__icon" /> : <span className="report-item__dot" aria-hidden="true" />}
                    <p>
                      <strong>{item.label}</strong>
                      <span className="report-item__detail">{item.detail}</span>
                    </p>
                  </li>
                )
              })}
            </ul>
          )}
          {extras[section.id]}
        </section>
      ))}

      <footer className="report-document__footer">
        Findings are based on publicly visible signals from a single page at the time of analysis. Items marked as not
        detected may still exist. Google rankings change daily and can differ by location.
      </footer>
    </article>
  )
}
