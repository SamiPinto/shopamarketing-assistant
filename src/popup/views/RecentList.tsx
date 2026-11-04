import { ChevronRight, History } from 'lucide-react'
import { DEMO_BUSINESSES } from '../../data/demoBusinesses'
import { useAnalysis } from '../../hooks/analysisContextValue'
import { relativeAge, relativeTime } from '../../utils/format'
import { DemoBadge } from '../../components/ui/Primitives'

interface Row {
  key: string
  name: string
  meta: string
  when: string
  demo: boolean
  onClick(): void
}

/**
 * Shows stored analyses. Before the first real analysis it shows the three demo
 * businesses as labelled samples so the list is never an empty box.
 */
export function RecentList({ onOpen }: { onOpen(): void }) {
  const { recent, selectAnalysis, analyseDemo } = useAnalysis()

  const rows: Row[] = recent.length
    ? recent.slice(0, 3).map((a) => ({
        key: a.id,
        name: a.business.name,
        meta: a.business.location?.label ?? a.business.domain,
        when: relativeTime(a.analysedAt),
        demo: a.source === 'demo',
        onClick: () => {
          selectAnalysis(a.id)
          onOpen()
        },
      }))
    : DEMO_BUSINESSES.map((b) => ({
        key: b.id,
        name: b.name,
        meta: b.city,
        when: relativeAge(b.sampleAgeMinutes * 60),
        demo: true,
        onClick: () => {
          void analyseDemo(b.id).then((result) => result && onOpen())
        },
      }))

  return (
    <section className="recent" aria-labelledby="recent-heading">
      <div className="recent__head">
        <h2 id="recent-heading" className="eyebrow">
          <History size={12} aria-hidden="true" /> Recent analyses
        </h2>
        {!recent.length && <span className="recent__note">Sample entries</span>}
      </div>
      <ul className="recent__list">
        {rows.map((row) => (
          <li key={row.key}>
            <button type="button" className="recent-row" onClick={row.onClick}>
              <span className="recent-row__initial" aria-hidden="true">
                {row.name.charAt(0)}
              </span>
              <span className="recent-row__main">
                <span className="recent-row__name">
                  {row.name}
                  {row.demo && <DemoBadge label="Demo" />}
                </span>
                <span className="recent-row__meta">{row.meta}</span>
              </span>
              <span className="recent-row__when">{row.when}</span>
              <ChevronRight size={14} aria-hidden="true" className="recent-row__chevron" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
