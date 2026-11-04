import { useState } from 'react'
import { ArrowRight, Ban, FileText, Globe, LayoutDashboard, ScanSearch } from 'lucide-react'
import { DEMO_BUSINESSES } from '../../data/demoBusinesses'
import { useAnalysis } from '../../hooks/analysisContextValue'
import { useOpenDashboard } from '../../hooks/useOpenDashboard'
import { Button } from '../../components/ui/Button'
import { DemoBadge } from '../../components/ui/Primitives'
import { truncate } from '../../utils/format'
import { RecentList } from './RecentList'

interface Props {
  onAnalysed(): void
}

export function HomeView({ onAnalysed }: Props) {
  const { settings, activeTab, analyseActiveTab, analyseDemo, ready } = useAnalysis()
  const openDashboard = useOpenDashboard()
  const [demoId, setDemoId] = useState(DEMO_BUSINESSES[0].id)

  const canAnalyseTab = activeTab?.eligibility.ok ?? false
  const blocked = !settings.demoMode && ready && !canAnalyseTab

  function runAnalysis() {
    return settings.demoMode ? analyseDemo(demoId) : analyseActiveTab()
  }

  // One click: analyse the page, then open the client report in the dashboard.
  async function handleGenerateReport() {
    if (await runAnalysis()) await openDashboard('client')
  }

  async function handleQuickAnalysis() {
    if (await runAnalysis()) onAnalysed()
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

      {settings.demoMode ? (
        <section className="target target--demo" aria-labelledby="demo-heading">
          <div className="target__label-row">
            <p id="demo-heading" className="eyebrow">
              Demo business
            </p>
            <DemoBadge />
          </div>
          <div className="demo-picker" role="radiogroup" aria-labelledby="demo-heading">
            {DEMO_BUSINESSES.map((b) => (
              <label key={b.id} className={`demo-option${demoId === b.id ? ' demo-option--selected' : ''}`}>
                <input type="radio" name="demo" value={b.id} checked={demoId === b.id} onChange={() => setDemoId(b.id)} />
                <span className="demo-option__name">{b.name}</span>
                <span className="demo-option__meta">
                  {b.description} · {b.city}
                </span>
              </label>
            ))}
          </div>
        </section>
      ) : (
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
                Open a business website in this window, or switch on Demo mode to explore with fictional businesses.
              </p>
            </>
          )}
        </section>
      )}

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
