import { ArrowLeft, FileText, Target } from 'lucide-react'
import { useOpenDashboard } from '../../hooks/useOpenDashboard'
import type { MarketingAnalysis } from '../../types/analysis'
import { Button } from '../../components/ui/Button'
import { InsightPanel } from '../../components/overview/InsightPanel'
import { OpportunityList } from '../../components/overview/OpportunityList'
import { ServiceFitList } from '../../components/overview/ServiceFitList'

export function OpportunitiesView({ analysis, onBack }: { analysis: MarketingAnalysis; onBack(): void }) {
  const openDashboard = useOpenDashboard()
  return (
    <div className="popup-view opportunities">
      <div className="results__top">
        <button type="button" className="link-button" onClick={onBack}>
          <ArrowLeft size={14} aria-hidden="true" /> Summary
        </button>
        <span className="results__top-title">{analysis.business.name}</span>
      </div>

      <InsightPanel insight={analysis.insight} compact />

      <section aria-labelledby="opps-heading">
        <h2 id="opps-heading" className="eyebrow popup-section-title">
          Marketing opportunities
        </h2>
        <OpportunityList analysis={analysis} showEvidence={false} />
      </section>

      <section aria-labelledby="services-heading">
        <h2 id="services-heading" className="eyebrow popup-section-title">
          Potential service fit <span className="eyebrow__note">— not a confirmed need</span>
        </h2>
        <ServiceFitList services={analysis.services} compact />
      </section>

      <div className="button-row button-row--sticky">
        <Button icon={Target} onClick={() => void openDashboard('strategy')}>
          Build Strategy
        </Button>
        <Button variant="primary" icon={FileText} onClick={() => void openDashboard('client')}>
          Generate Report
        </Button>
      </div>
    </div>
  )
}
