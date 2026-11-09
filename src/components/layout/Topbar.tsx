import { useAnalysis } from '../../hooks/analysisContextValue'
import { relativeTime } from '../../utils/format'
import { DeleteAnalysisButton } from './DeleteAnalysisButton'
import { SettingsButton } from './SettingsDialog'
import { UrlAnalyseForm } from './UrlAnalyseForm'

export function Topbar() {
  const { recent, current, selectAnalysis } = useAnalysis()

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
                  {a.business.name} — {a.business.domain} ({relativeTime(a.analysedAt)})
                </option>
              ))}
            </select>
          </label>
        )}
        {current && <UrlAnalyseForm />}
      </div>
      <div className="topbar__right">
        <SettingsButton />
        {current && <DeleteAnalysisButton key={current.id} analysis={current} />}
      </div>
    </div>
  )
}
