import { ArrowRight, CircleCheck, CircleDashed, CircleHelp, Sparkles, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ClientReport, GlanceStatus } from '../../types/clientReport'
import { BrandLogo } from '../ui/Primitives'
import { WebsiteFactsGrid } from '../website/WebsiteFactsGrid'

const GLANCE_ICON: Record<GlanceStatus, LucideIcon> = {
  strong: CircleCheck,
  improve: TriangleAlert,
  missing: CircleDashed,
  unknown: CircleHelp,
}

/** Printable 1–2 page A4 client snapshot. */
export function ClientReportDocument({ report }: { report: ClientReport }) {
  return (
    <article className="client-report" aria-label="Website opportunity snapshot">
      <header className="client-report__header">
        <BrandLogo width={150} />
        <div className="client-report__header-meta">
          <p className="client-report__kicker">Website Opportunity Snapshot</p>
          <p>{report.date}</p>
        </div>
      </header>

      {report.isDemo && <p className="report-document__demo">DEMO DATA — fictional business for demonstration only.</p>}

      <section className="client-report__hero">
        <p className="client-report__for">Prepared for</p>
        <h1 className="client-report__business">{report.business}</h1>
        <p className="client-report__site">{report.website}</p>
        <p className="client-report__intro">{report.intro}</p>
      </section>

      <section className="pitch" aria-label="Our recommendation">
        <p className="pitch__kicker">Our recommendation</p>
        <p className="pitch__line pitch__line--lead">{report.pitch[0]}</p>
        <p className="pitch__line">{report.pitch[1]}</p>
      </section>

      <section className="client-report__section">
        <h2 className="client-report__h2">Your website at a glance</h2>
        <WebsiteFactsGrid facts={report.websiteFacts} compact />
      </section>

      {report.comparison.length > 0 && (
        <section className="client-report__section">
          <h2 className="client-report__h2">How you compare</h2>
          <table className="compare-table">
            <thead>
              <tr>
                <th scope="col">Website</th>
                <th scope="col">Technology</th>
                <th scope="col">Speed</th>
                <th scope="col">Mobile</th>
                <th scope="col">Design</th>
              </tr>
            </thead>
            <tbody>
              {report.comparison.map((row) => (
                <tr key={row.domain} className={row.isSubject ? 'compare-table__subject' : undefined}>
                  <th scope="row">
                    {row.name}
                    {row.isSubject && <span className="compare-table__you"> (you)</span>}
                  </th>
                  <td>{row.platform}</td>
                  <td>{row.speed}</td>
                  <td>{row.mobile}</td>
                  <td>{row.design}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="client-report__section">
        <h2 className="client-report__h2">Marketing at a glance</h2>
        <ul className="glance">
          {report.glance.map((g) => {
            const Icon = GLANCE_ICON[g.status]
            return (
              <li key={g.area} className={`glance__item glance__item--${g.status}`}>
                <span className="glance__area">{g.area}</span>
                <span className="glance__status">
                  <Icon size={13} strokeWidth={2.4} aria-hidden="true" />
                  {g.label}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {report.strengths.length > 0 && (
        <section className="client-report__section">
          <h2 className="client-report__h2">What’s working well</h2>
          <ul className="strengths">
            {report.strengths.map((s) => (
              <li key={s}>
                <CircleCheck size={15} aria-hidden="true" />
                {s}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="client-report__section">
        <h2 className="client-report__h2">Top {report.improvements.length} improvements</h2>
        <ol className="improvements">
          {report.improvements.map((item, index) => (
            <li key={item.id} className="improvement">
              <span className="improvement__num" aria-hidden="true">
                {index + 1}
              </span>
              <div className="improvement__body">
                <div className="improvement__head">
                  <h3 className="improvement__title">{item.title}</h3>
                  <span className={`improvement__tag improvement__tag--${item.kind}`}>
                    {item.kind === 'growth' ? (
                      <>
                        <Sparkles size={11} aria-hidden="true" /> Growth idea
                      </>
                    ) : (
                      item.service
                    )}
                  </span>
                </div>
                <dl className="improvement__grid">
                  <div>
                    <dt>{item.kind === 'growth' ? 'Context' : 'What we found'}</dt>
                    <dd>{item.found}</dd>
                  </div>
                  <div>
                    <dt>Why it matters</dt>
                    <dd>{item.whyItMatters}</dd>
                  </div>
                  <div>
                    <dt>How Shopa can help</dt>
                    <dd>{item.howShopaHelps}</dd>
                  </div>
                </dl>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="client-report__next">
        <h2 className="client-report__h2 client-report__h2--light">Suggested next steps</h2>
        <ol>
          {report.nextSteps.map((s) => (
            <li key={s}>
              <ArrowRight size={14} aria-hidden="true" />
              {s}
            </li>
          ))}
        </ol>
        {(report.preparedBy || report.contactLine) && (
          <p className="client-report__contact">
            {report.preparedBy && <strong>{report.preparedBy}</strong>}
            {report.preparedBy && report.contactLine && ' · '}
            {report.contactLine}
          </p>
        )}
      </section>

      <footer className="client-report__footer">{report.disclaimer}</footer>
    </article>
  )
}
