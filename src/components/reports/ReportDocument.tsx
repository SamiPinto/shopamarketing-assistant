import type { OpportunityReport } from '../../types/misc'
import { BrandLogo } from '../ui/Primitives'

export function ReportDocument({ report }: { report: OpportunityReport }) {
  return (
    <article className="report-document" aria-label="Opportunity report">
      <header className="report-document__masthead">
        <BrandLogo width={120} />
        <span className="report-document__classification">Internal research</span>
      </header>

      {report.isDemo && (
        <p className="report-document__demo">DEMO DATA — fictional business for demonstration only.</p>
      )}

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
        {report.preparedBy && (
          <div>
            <dt>Prepared by</dt>
            <dd>{report.preparedBy}</dd>
          </div>
        )}
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
          {section.bullets && section.bullets.length > 0 && (
            <ul>
              {section.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          )}
        </section>
      ))}

      <footer className="report-document__footer">
        Findings are based on publicly visible signals from a single page at the time of analysis. Items marked as not
        detected may still exist. Potential service fit is not a confirmed need.
      </footer>
    </article>
  )
}
