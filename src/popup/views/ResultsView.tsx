import { ArrowLeft, ArrowRight, Copy, FileText, LayoutDashboard, Lightbulb } from 'lucide-react'
import { useAnalysis } from '../../hooks/analysisContextValue'
import { useClipboard } from '../../hooks/useClipboard'
import { useOpenDashboard } from '../../hooks/useOpenDashboard'
import { countSignals } from '../../services/analysis/opportunities'
import { reportService } from '../../services/reportService'
import type { MarketingAnalysis } from '../../types/analysis'
import { Button } from '../../components/ui/Button'
import { DemoBadge } from '../../components/ui/Primitives'
import { CategoryStatusList } from '../../components/overview/CategoryStatusList'

interface Props {
  analysis: MarketingAnalysis
  onBack(): void
  onViewOpportunities(): void
}

export function ResultsView({ analysis, onBack, onViewOpportunities }: Props) {
  const openDashboard = useOpenDashboard()
  const { copy, copied } = useClipboard()
  const { resetRun } = useAnalysis()
  const signals = countSignals(analysis.opportunities)

  return (
    <div className="popup-view results">
      <div className="results__top">
        <button
          type="button"
          className="link-button"
          onClick={() => {
            resetRun()
            onBack()
          }}
        >
          <ArrowLeft size={14} aria-hidden="true" /> New analysis
        </button>
        {analysis.source === 'demo' && <DemoBadge />}
      </div>

      <section className="results__hero">
        <p className="eyebrow eyebrow--accent">Analysis complete</p>
        <p className="results__count">
          <span className="results__number">{signals}</span>
          <span className="results__count-label">
            opportunity {signals === 1 ? 'signal' : 'signals'}
            <br />
            detected
          </span>
        </p>
        <p className="results__business">
          <strong>{analysis.business.name}</strong>
          <span className="mono">{analysis.business.domain}</span>
        </p>
      </section>

      <CategoryStatusList analysis={analysis} onSelect={(id) => void openDashboard(id)} />

      <div className="results__actions">
        <Button variant="primary" block icon={FileText} iconRight={ArrowRight} onClick={() => void openDashboard('client')}>
          Sales Talking Points
        </Button>
        <div className="button-row">
          <Button icon={Lightbulb} onClick={onViewOpportunities}>
            Opportunities
          </Button>
          <Button icon={LayoutDashboard} onClick={() => void openDashboard('overview')}>
            Dashboard
          </Button>
          <Button icon={Copy} onClick={() => void copy('summary', reportService.summary(analysis))}>
            {copied === 'summary' ? 'Copied' : 'Copy Summary'}
          </Button>
        </div>
      </div>
    </div>
  )
}
