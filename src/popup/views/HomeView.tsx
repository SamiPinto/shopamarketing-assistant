import { ArrowRight, Ban, FileText, Globe, LayoutDashboard, ScanSearch } from 'lucide-react'
import { useAnalysis } from '../../hooks/analysisContextValue'
import { useOpenDashboard } from '../../hooks/useOpenDashboard'
import { Button } from '../../components/ui/Button'
import { truncate } from '../../utils/format'
import { RecentList } from './RecentList'

interface Props {
  onAnalysed(): void
}

export function HomeView({ onAnalysed }: Props) {
  const { activeTab, analyseActiveTab, ready } = useAnalysis()
  const openDashboard = useOpenDashboard()

  const canAnalyseTab = activeTab?.eligibility.ok ?? false
  const blocked = ready && !canAnalyseTab

  // One click: analyse the page, then open the client report in the dashboard.
  async function handleGenerateReport() {
    if (await analyseActiveTab()) await openDashboard('client')
  }

  async function handleQuickAnalysis() {
    if (await analyseActiveTab()) onAnalysed()
  }

  return (
    <div className="popup-view home">
      <section className="home__hero">
        <h1 className="home__headline">
          Marketing intelligence
          <br />
          <em>for every prospect.</em>
        </h1>
      </section>

        <section className="target" aria-labelledby="target-heading">
          <p id="target-heading" className="eyebrow">
            Current website
          </p>
          {!ready ? (
            <div className="target__skeleton" aria-hidden="true" />
          ) : activeTab ? (
            <>
              <p className="target__title">{truncate(activeTab.title || activeTab.domain, 70)}</p>
              <p className="target__domain mono">
                <Globe size={13} aria-hidden="true" />
                {activeTab.domain || 'Unknown page'}
              </p>
              <p className="target__url mono" title={activeTab.url}>
                {truncate(activeTab.url, 64)}
              </p>
              <p className={`target__status${canAnalyseTab ? '' : ' target__status--blocked'}`}>
                {canAnalyseTab ? (
                  <>
                    <span className="pulse-dot" aria-hidden="true" /> Ready to analyse
                  </>
                ) : (
                  <>
                    <Ban size={13} aria-hidden="true" /> This page can't be analysed.
                  </>
                )}
              </p>
            </>
          ) : (
            <>
              <p className="target__title">No website detected</p>
              <p className="target__hint">
                Open a business website in this window to analyse it.
              </p>
            </>
          )}
        </section>

      <div className="home__actions">
        <Button
          variant="primary"
          size="lg"
          block
          icon={FileText}
          iconRight={ArrowRight}
          onClick={() => void handleGenerateReport()}
          disabled={blocked}
        >
          Generate Report
        </Button>
        <div className="button-row">
          <Button icon={ScanSearch} onClick={() => void handleQuickAnalysis()} disabled={blocked}>
            Quick Analysis
          </Button>
          <Button icon={LayoutDashboard} onClick={() => void openDashboard()}>
            Dashboard
          </Button>
        </div>
        <p className="home__hint">Generate Report analyses this page and opens a 1–2 page client snapshot with talking points.</p>
      </div>

      <RecentList onOpen={onAnalysed} />
    </div>
  )
}
