import { Sparkles } from 'lucide-react'
import { DEMO_BUSINESSES } from '../../data/demoBusinesses'
import { useAnalysis } from '../../hooks/analysisContextValue'
import { relativeTime } from '../../utils/format'
import { DemoBadge } from '../ui/Primitives'
import { DeleteAnalysisButton } from './DeleteAnalysisButton'
import { SettingsButton } from './SettingsDialog'
import { UrlAnalyseForm } from './UrlAnalyseForm'

export function Topbar() {
  const { recent, current, selectAnalysis, analyseDemo, run } = useAnalysis()

  return (
    <div className="topbar">
      <div className="topbar__left">
        {recent.length > 0 && (
          <label className="select-field">
            <span className="select-field__label">Analysis</span>
            <select value={current?.id ?? ''} onChange={(e) => selectAnalysis(e.target.value)}>
              {!current && <option value="">Select an analysis</option>}
              {recent.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.business.name} — {a.business.domain} ({relativeTime(a.analysedAt)}){a.source === 'demo' ? ' · DEMO' : ''}
                </option>
              ))}
            </select>
          </label>
        )}
        {current?.source === 'demo' && <DemoBadge />}
        {current && <UrlAnalyseForm />}
      </div>
      <div className="topbar__right">
        <span className="topbar__label">
          <Sparkles size={13} aria-hidden="true" /> Demo
        </span>
        {DEMO_BUSINESSES.map((b) => (
          <button
            key={b.id}
            type="button"
            className="chip-button"
            disabled={run.phase === 'running'}
            onClick={() => void analyseDemo(b.id)}
            title={`Load ${b.name} (fictional demo business)`}
          >
            {b.name.replace('Demo ', '')}
          </button>
        ))}
        <SettingsButton />
        {current && <DeleteAnalysisButton key={current.id} analysis={current} />}
      </div>
    </div>
  )
}
