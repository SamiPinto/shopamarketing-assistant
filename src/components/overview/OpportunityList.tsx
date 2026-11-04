import type { MarketingAnalysis, Opportunity } from '../../types/analysis'
import { StatusBadge } from '../ui/StatusBadge'
import { CATEGORY_ICONS } from './categoryMeta'

interface Props {
  analysis: MarketingAnalysis
  opportunities?: Opportunity[]
  showEvidence?: boolean
  compact?: boolean
}

const PRIORITY_LABEL = { high: 'Higher priority', medium: 'Medium priority', low: 'Lower priority' } as const

export function OpportunityList({ analysis, opportunities = analysis.opportunities, showEvidence = true, compact }: Props) {
  if (opportunities.length === 0) {
    return <p className="muted-text">No opportunity signals in this area from the analysed page.</p>
  }
  return (
    <ol className={`opportunity-list${compact ? ' opportunity-list--compact' : ''}`}>
      {opportunities.map((o) => {
        const Icon = CATEGORY_ICONS[o.category]
        return (
          <li key={o.id} className={`opportunity opportunity--${o.priority}`}>
            <div className="opportunity__head">
              <span className="opportunity__category">
                <Icon size={12} aria-hidden="true" />
                {analysis.categories[o.category].label}
              </span>
              <StatusBadge kind="certainty" status={o.certainty} compact />
            </div>
            <h4 className="opportunity__title">{o.title}</h4>
            {!compact && <p className="opportunity__detail">{o.detail}</p>}
            {showEvidence && !compact && (
              <p className="opportunity__evidence">
                <span className="sr-only">{PRIORITY_LABEL[o.priority]}. </span>
                <span className="opportunity__evidence-label">Evidence</span> {o.evidence}
              </p>
            )}
          </li>
        )
      })}
    </ol>
  )
}
