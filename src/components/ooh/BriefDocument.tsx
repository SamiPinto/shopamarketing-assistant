import type { OOHBrief } from '../../types/ooh'
import { formatDate } from '../../utils/format'

export function BriefDocument({ brief }: { brief: OOHBrief }) {
  return (
    <article className="brief">
      <header className="brief__header">
        <p className="eyebrow">Shopa Marketing · OOH campaign brief</p>
        <p className="brief__date">Prepared {formatDate(brief.createdAt)}</p>
      </header>
      <dl className="brief__grid">
        {brief.sections.map((s) => (
          <div key={s.heading} className="brief__row">
            <dt>{s.heading}</dt>
            <dd>
              {s.lines.length > 1 ? (
                <ul>
                  {s.lines.map((l) => (
                    <li key={l}>{l}</li>
                  ))}
                </ul>
              ) : (
                <span className={s.lines[0] === 'To be confirmed' ? 'muted-text' : undefined}>{s.lines[0]}</span>
              )}
            </dd>
          </div>
        ))}
      </dl>
      <div className="brief__outstanding">
        <p className="brief__outstanding-title">Outstanding information</p>
        <ul>
          {brief.outstanding.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
        <p className="muted-text">
          This brief contains no inventory availability, pricing or audience figures. These must be sourced from
          media owners.
        </p>
      </div>
    </article>
  )
}
