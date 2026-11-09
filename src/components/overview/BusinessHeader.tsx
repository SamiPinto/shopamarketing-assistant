import { Building2, Clock, ExternalLink, MapPin } from 'lucide-react'
import type { MarketingAnalysis } from '../../types/analysis'
import { formatDateTime } from '../../utils/format'

export function BusinessHeader({ analysis }: { analysis: MarketingAnalysis }) {
  const { business } = analysis
  return (
    <header className="business-header">
      <div className="business-header__title-row">
        <h1 className="business-header__name">{business.name}</h1>
      </div>
      <ul className="business-header__facts">
        <li>
          <a href={business.url} target="_blank" rel="noreferrer noopener" className="mono link">
            {business.domain}
            <ExternalLink size={12} aria-hidden="true" />
          </a>
        </li>
        <li title={business.industry?.basis}>
          <Building2 size={13} aria-hidden="true" />
          {business.industry ? business.industry.label : 'Industry not detected'}
        </li>
        <li title={business.location?.basis}>
          <MapPin size={13} aria-hidden="true" />
          {business.location ? business.location.label : 'Location not detected'}
        </li>
        <li>
          <Clock size={13} aria-hidden="true" />
          Analysed {formatDateTime(analysis.analysedAt)}
        </li>
      </ul>
    </header>
  )
}
