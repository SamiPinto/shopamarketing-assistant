import { ChevronRight, History } from 'lucide-react'
import { useAnalysis } from '../../hooks/analysisContextValue'
import { relativeTime } from '../../utils/format'

/** The three most recent stored analyses; hidden until the first one exists. */
export function RecentList({ onOpen }: { onOpen(): void }) {
  const { recent, selectAnalysis } = useAnalysis()
  if (!recent.length) return null

  return (
    <section className="recent" aria-labelledby="recent-heading">
      <div className="recent__head">
        <h2 id="recent-heading" className="eyebrow">
          <History size={12} aria-hidden="true" /> Recent analyses
        </h2>
      </div>
      <ul className="recent__list">
        {recent.slice(0, 3).map((a) => (
          <li key={a.id}>
            <button
              type="button"
              className="recent-row"
              onClick={() => {
                selectAnalysis(a.id)
                onOpen()
              }}
            >
              <span className="recent-row__initial" aria-hidden="true">
                {a.business.name.charAt(0)}
              </span>
              <span className="recent-row__main">
                <span className="recent-row__name">{a.business.name}</span>
                <span className="recent-row__meta">{a.business.location?.label ?? a.business.domain}</span>
              </span>
              <span className="recent-row__when">{relativeTime(a.analysedAt)}</span>
              <ChevronRight size={14} aria-hidden="true" className="recent-row__chevron" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
