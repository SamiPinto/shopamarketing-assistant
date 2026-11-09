import { Suspense, useEffect, useRef } from 'react'
import { ScanSearch } from 'lucide-react'
import { AnalysisProvider } from '../hooks/AnalysisContext'
import { useAnalysis } from '../hooks/analysisContextValue'
import { useHashRoute } from '../hooks/useHashRoute'
import { ACTIVE_ROUTES, ROUTE_DEFINITIONS, type RouteId } from '../pages/dashboardRoutes'
import { ModuleErrorBoundary } from '../components/layout/ModuleErrorBoundary'
import { Sidebar } from '../components/layout/Sidebar'
import { Topbar } from '../components/layout/Topbar'
import { UrlAnalyseForm } from '../components/layout/UrlAnalyseForm'
import { EmptyState } from '../components/ui/Primitives'

function ModuleFallback() {
  return (
    <div className="module-loading" role="status">
      <span className="spinner" aria-hidden="true" />
      <span>Loading module…</span>
    </div>
  )
}

function NoAnalysis() {
  return (
    <div className="dashboard-empty">
      <EmptyState icon={ScanSearch} title="No analysis yet">
        <p>Enter a business website below to analyse it.</p>
      </EmptyState>
      <UrlAnalyseForm variant="hero" />
      <p className="dashboard-empty__hint muted-text">
        You can also open a business website, click the Shopa icon and choose <strong>Generate Report</strong>.
      </p>
    </div>
  )
}

function DashboardShell() {
  const { current, ready } = useAnalysis()
  const [route, navigate] = useHashRoute<RouteId>(ACTIVE_ROUTES, 'overview')
  const mainRef = useRef<HTMLElement>(null)
  const definition = ROUTE_DEFINITIONS.find((r) => r.id === route) ?? ROUTE_DEFINITIONS[0]
  const Module = definition.component

  useEffect(() => {
    document.title = `${definition.label} — Shopa Marketing Assistant`
    mainRef.current?.scrollTo({ top: 0 })
  }, [definition.label])

  return (
    <div className="dashboard">
      <Sidebar route={route} onNavigate={navigate} analysis={current} />
      <div className="dashboard__content">
        <Topbar />
        <main ref={mainRef} className="dashboard__main" id="main">
          {!ready ? (
            <ModuleFallback />
          ) : current ? (
            <ModuleErrorBoundary key={`${route}-${current.id}`}>
              <Suspense fallback={<ModuleFallback />}>
                <div className="module-transition">
                  <Module analysis={current} navigate={navigate} />
                </div>
              </Suspense>
            </ModuleErrorBoundary>
          ) : (
            <NoAnalysis />
          )}
        </main>
      </div>
    </div>
  )
}

export function Dashboard() {
  return (
    <AnalysisProvider loadLast>
      <a href="#main" className="skip-link">
        Skip to content
      </a>
      <DashboardShell />
    </AnalysisProvider>
  )
}
