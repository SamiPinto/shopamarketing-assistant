import { ChevronRight } from 'lucide-react'
import { HIDDEN_SCREENS, VISIBLE_CATEGORIES } from '../../config/features'
import type { CategoryId, MarketingAnalysis } from '../../types/analysis'
import { plural } from '../../utils/format'
import { StatusBadge } from '../ui/StatusBadge'
import { CATEGORY_META } from '../ui/statusMeta'
import { CATEGORY_ICONS, signalCount } from './categoryMeta'

interface Props {
  analysis: MarketingAnalysis
  onSelect?(id: CategoryId): void
  showSummary?: boolean
  categories?: CategoryId[]
}

export function CategoryStatusList({ analysis, onSelect, showSummary = false, categories = VISIBLE_CATEGORIES }: Props) {
  return (
    <ul className={`category-list${showSummary ? ' category-list--detailed' : ''}`}>
      {categories.map((id) => {
        const category = analysis.categories[id]
        const Icon = CATEGORY_ICONS[id]
        const count = signalCount(analysis, id)
        // Categories whose screen is hidden are listed but not clickable.
        const select = HIDDEN_SCREENS.includes(id) ? undefined : onSelect
        const content = (
          <>
            <span className="category-row__icon">
              <Icon size={15} aria-hidden="true" />
            </span>
            <span className="category-row__main">
              <span className="category-row__label">{category.label}</span>
              {showSummary && <span className="category-row__summary">{category.summary}</span>}
              {showSummary && category.score !== null && (
                <span className="category-row__score" aria-label={`Rule-based score ${category.score} out of 100`}>
                  <span className={`category-row__bar category-row__bar--${CATEGORY_META[category.status].tone}`} aria-hidden="true">
                    <span style={{ width: `${category.score}%` }} />
                  </span>
                  <span className="category-row__score-value" aria-hidden="true">
                    {category.score}/100
                  </span>
                </span>
              )}
            </span>
            <span className="category-row__meta">
              {count > 0 && <span className="category-row__count">{plural(count, 'signal')}</span>}
              <StatusBadge kind="category" status={category.status} compact />
              {select && <ChevronRight size={14} aria-hidden="true" className="category-row__chevron" />}
            </span>
          </>
        )
        return (
          <li key={id}>
            {select ? (
              <button type="button" className="category-row category-row--interactive" onClick={() => select(id)}>
                {content}
              </button>
            ) : (
              <div className="category-row">{content}</div>
            )}
          </li>
        )
      })}
    </ul>
  )
}
