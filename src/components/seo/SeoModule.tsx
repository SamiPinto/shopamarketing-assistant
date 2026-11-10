import type { ModuleProps } from '../../pages/dashboardRoutes'
import { CATEGORY_ICONS } from '../overview/categoryMeta'
import { KeywordRankings } from './KeywordRankings'

/** SEO screen: Google rankings by location against local competitors, nothing else. */
export default function SeoModule({ analysis }: ModuleProps) {
  const Icon = CATEGORY_ICONS.seo
  return (
    <div className="module">
      <header className="module-header">
        <div className="module-header__title-row">
          <span className="module-header__icon">
            <Icon size={18} aria-hidden="true" />
          </span>
          <h1 className="module-header__title">{analysis.categories.seo.label}</h1>
        </div>
        <p className="module-header__description">
          Whether {analysis.business.name} ranks on Google for its services in each suburb, city or pincode, at which
          position, and which competitors rank above it.
        </p>
      </header>

      <div className="module-grid module-grid--single">
        <div className="module-grid__main">
          <KeywordRankings analysis={analysis} />
        </div>
      </div>
    </div>
  )
}
