import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { AnalysisProvider } from '../hooks/AnalysisContext'
import { SCAN_STEPS, useAnalysis } from '../hooks/analysisContextValue'
import { AnalysisErrorView } from '../components/ui/AnalysisErrorView'
import { Button } from '../components/ui/Button'
import { ScanProgress } from '../components/ui/ScanProgress'
import { PopupHeader } from './PopupHeader'
import { HomeView } from './views/HomeView'
import { OpportunitiesView } from './views/OpportunitiesView'
import { ResultsView } from './views/ResultsView'

type View = 'home' | 'results' | 'opportunities'

function PopupBody() {
  const { run, current, activeTab, resetRun, analyseActiveTab } = useAnalysis()
  const [view, setView] = useState<View>('home')

  if (run.phase === 'running') {
    return (
      <div className="popup-view popup-view--center">
        <ScanProgress steps={SCAN_STEPS} current={run.step} domain={activeTab?.domain} />
      </div>
    )
  }

  if (run.phase === 'error' && run.error) {
    const canRetry = ['no-content-script', 'no-response', 'failed'].includes(run.error.code)
    return (
      <div className="popup-view popup-view--center">
        <AnalysisErrorView
          code={run.error.code}
          message={run.error.message}
          actions={
            <>
              {canRetry && (
                <Button variant="primary" icon={RotateCcw} onClick={() => void analyseActiveTab()}>
                  Try again
                </Button>
              )}
              <Button variant="ghost" onClick={resetRun}>
                Back
              </Button>
            </>
          }
        />
        <p className="footnote">
          Some information may not be detectable from a page. This does not mean the information doesn't exist.
        </p>
      </div>
    )
  }

  if (view === 'opportunities' && current) {
    return <OpportunitiesView analysis={current} onBack={() => setView('results')} />
  }
  if (view === 'results' && current) {
    return (
      <ResultsView analysis={current} onBack={() => setView('home')} onViewOpportunities={() => setView('opportunities')} />
    )
  }
  return <HomeView onAnalysed={() => setView('results')} />
}

export function Popup() {
  return (
    <AnalysisProvider>
      <div className="popup">
        <PopupHeader />
        <main className="popup__main">
          <PopupBody />
        </main>
      </div>
    </AnalysisProvider>
  )
}
