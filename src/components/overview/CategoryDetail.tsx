import { CircleCheck, CircleHelp, TriangleAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CategoryId, Check, MarketingAnalysis } from '../../types/analysis'
import { CheckList } from '../ui/CheckList'
import { SignalMeter } from '../ui/Primitives'
import { StatusBadge } from '../ui/StatusBadge'
import { CATEGORY_ICONS, goodChecks } from './categoryMeta'
import { OpportunityList } from './OpportunityList'

interface Props {
  analysis: MarketingAnalysis
  id: CategoryId
  description: string
  checksTitle?: string
  /** Show checks as separate positive / negative lists (default) instead of one mixed list. */
  splitChecks?: boolean
  /** Module-specific content shown between the summary and the checks. */
  children?: ReactNode
  aside?: ReactNode
}

interface CheckGroup {
  key: string
  title: string
  tone: 'good' | 'attention' | 'muted'
  icon: LucideIcon
  checks: Check[]
}

function splitByOutcome(checks: Check[]): CheckGroup[] {
  return [
    { key: 'positive', title: 'Positive points', tone: 'good' as const, icon: CircleCheck, checks: checks.filter((c) => c.status === 'good') },
    {
      key: 'negative',
      title: 'Negative points',
      tone: 'attention' as const,
      icon: TriangleAlert,
      checks: checks.filter((c) => c.status === 'attention' || c.status === 'not-detected'),
    },
    { key: 'unknown', title: 'Couldn’t verify', tone: 'muted' as const, icon: CircleHelp, checks: checks.filter((c) => c.status === 'unknown') },
  ].filter((g) => g.key !== 'unknown' || g.checks.length > 0)
}

/** Shared layout for category modules: summary → extras → checks → opportunities. */
export function CategoryDetail({ analysis, id, description, checksTitle = 'Checks', splitChecks = true, children, aside }: Props) {
  const category = analysis.categories[id]
  const Icon = CATEGORY_ICONS[id]
  const { good, total } = goodChecks(analysis, id)
  const opportunities = analysis.opportunities.filter((o) => o.category === id)

  return (
    <div className="module">
      <header className="module-header">
        <div className="module-header__title-row">
          <span className="module-header__icon">
            <Icon size={18} aria-hidden="true" />
          </span>
          <h1 className="module-header__title">{category.label}</h1>
          <StatusBadge kind="category" status={category.status} />
        </div>
        <p className="module-header__description">{description}</p>
      </header>

      <section className="summary-band">
        <p className="summary-band__text">{category.summary}</p>
        {category.score !== null && <SignalMeter score={category.score} good={good} total={total} />}
      </section>

      <div className={`module-grid${aside ? '' : ' module-grid--single'}`}>
        <div className="module-grid__main">
          {children}
          {splitChecks ? (
            splitByOutcome(category.checks).map(({ key, title, tone, icon: GroupIcon, checks }) => (
              <section key={key} className={`panel check-group check-group--${tone}`} aria-labelledby={`${id}-${key}`}>
                <h2 id={`${id}-${key}`} className="panel__title check-group__title">
                  <GroupIcon size={13} aria-hidden="true" /> {title} ({checks.length})
                </h2>
                {checks.length ? <CheckList checks={checks} /> : <p className="muted-text">None found.</p>}
              </section>
            ))
          ) : (
            <section className="panel" aria-labelledby={`${id}-checks`}>
              <h2 id={`${id}-checks`} className="panel__title">
                {checksTitle}
              </h2>
              <CheckList checks={category.checks} />
            </section>
          )}
        </div>
        <aside className="module-grid__aside">
          {aside}
          <section className="panel" aria-labelledby={`${id}-opps`}>
            <h2 id={`${id}-opps`} className="panel__title">
              Opportunities
            </h2>
            <OpportunityList analysis={analysis} opportunities={opportunities} />
          </section>
        </aside>
      </div>
    </div>
  )
}
