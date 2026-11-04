import { ROUTE_DEFINITIONS, type RouteId } from '../../pages/dashboardRoutes'
import type { MarketingAnalysis } from '../../types/analysis'
import { CATEGORY_META } from '../ui/statusMeta'
import { BrandLogo } from '../ui/Primitives'

interface Props {
  route: RouteId
  onNavigate(route: RouteId): void
  analysis: MarketingAnalysis | null
}

const GROUPS = ['Analysis', 'Research', 'Deliverables'] as const

export function Sidebar({ route, onNavigate, analysis }: Props) {
  return (
    <nav className="sidebar" aria-label="Dashboard sections">
      <div className="sidebar__brand">
        <BrandLogo width={120} />
        <p className="sidebar__product">Marketing Assistant</p>
      </div>

      {GROUPS.filter((group) => ROUTE_DEFINITIONS.some((r) => r.group === group)).map((group) => (
        <div key={group} className="sidebar__group">
          <p className="sidebar__group-label">{group}</p>
          <ul>
            {ROUTE_DEFINITIONS.filter((r) => r.group === group).map((r) => {
              const Icon = r.icon
              const status = analysis && r.category ? analysis.categories[r.category].status : null
              const meta = status ? CATEGORY_META[status] : null
              return (
                <li key={r.id}>
                  <a
                    href={`#${r.id}`}
                    className={`sidebar__link${route === r.id ? ' sidebar__link--active' : ''}`}
                    aria-current={route === r.id ? 'page' : undefined}
                    onClick={(e) => {
                      e.preventDefault()
                      onNavigate(r.id)
                    }}
                  >
                    <Icon size={16} aria-hidden="true" />
                    <span>{r.label}</span>
                    {meta && (
                      <span className={`sidebar__dot sidebar__dot--${meta.tone}`} title={meta.label}>
                        <span className="sr-only">{meta.label}</span>
                      </span>
                    )}
                  </a>
                </li>
              )
            })}
          </ul>
        </div>
      ))}

      <p className="sidebar__footer">
        Turn any business website into a marketing opportunity.
      </p>
    </nav>
  )
}
