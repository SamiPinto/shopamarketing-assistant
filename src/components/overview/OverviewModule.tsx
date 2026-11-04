import { ArrowRight, FileText, Target } from 'lucide-react'
import { FEATURES } from '../../config/features'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { countSignals } from '../../services/analysis/opportunities'
import { Button } from '../ui/Button'
import { Notice } from '../ui/Primitives'
import { BusinessHeader } from './BusinessHeader'
import { CategoryStatusList } from './CategoryStatusList'
import { InsightPanel } from './InsightPanel'
import { OpportunityList } from './OpportunityList'
import { ServiceFitList } from './ServiceFitList'

export default function OverviewModule({ analysis, navigate }: ModuleProps) {
  const signals = countSignals(analysis.opportunities)
  const research = analysis.opportunities.filter((o) => o.certainty === 'research').length
  const evidenced = analysis.opportunities.filter((o) => o.certainty !== 'research')

  return (
    <div className="module overview">
      <BusinessHeader analysis={analysis} />

      <section className="overview__hero">
        <div className="overview__figure">
          <p className="eyebrow">Opportunity signals detected</p>
          <p className="overview__number">{signals}</p>
          <p className="overview__figure-note">
            Counted from rule-based checks on this page{research ? `, plus ${research} area${research === 1 ? '' : 's'} requiring research` : ''}.
          </p>
          <div className="button-row">
            <Button variant="primary" icon={FileText} onClick={() => navigate('client')}>
              Client Report
            </Button>
            <Button icon={Target} onClick={() => navigate('strategy')}>
              Build Strategy
            </Button>
          </div>
        </div>
        <div className="overview__categories">
          <CategoryStatusList analysis={analysis} onSelect={navigate} showSummary />
        </div>
      </section>

      {analysis.page.truncated && (
        <Notice tone="attention" title="Large page">
          This page is very large, so extraction stopped at safe limits. Some elements may not be counted.
        </Notice>
      )}

      <InsightPanel insight={analysis.insight} />

      <div className="overview__columns">
        <section className="panel" aria-labelledby="top-opps">
          <div className="panel__head">
            <h2 id="top-opps" className="panel__title">
              Marketing opportunities
            </h2>
          </div>
          <OpportunityList analysis={analysis} opportunities={evidenced.slice(0, 6)} />
          {evidenced.length > 6 && (
            <p className="muted-text">+{evidenced.length - 6} more in the category modules.</p>
          )}
        </section>
        <section className="panel" aria-labelledby="service-fit">
          <div className="panel__head">
            <h2 id="service-fit" className="panel__title">
              Recommended Shopa services
            </h2>
            <span className="panel__note">Potential service fit — not a confirmed need</span>
          </div>
          <ServiceFitList services={analysis.services} />
          {FEATURES.ooh && (
            <button type="button" className="link-button" onClick={() => navigate('ooh')}>
              Evaluate OOH separately <ArrowRight size={13} aria-hidden="true" />
            </button>
          )}
        </section>
      </div>

      <p className="footnote">
        Some information could not be detected from this page. This does not mean the information doesn't exist.
      </p>
    </div>
  )
}
