import { LayoutDashboard } from 'lucide-react'
import { useAnalysis } from '../hooks/analysisContextValue'
import { useOpenDashboard } from '../hooks/useOpenDashboard'
import { BrandLogo } from '../components/ui/Primitives'

export function PopupHeader() {
  const { settings, updateSettings } = useAnalysis()
  const openDashboard = useOpenDashboard()

  return (
    <header className="popup-header">
      <div className="popup-header__brand">
        <BrandLogo width={84} />
        <p className="popup-header__product">
          Marketing
          <br />
          Assistant
        </p>
      </div>
      <div className="popup-header__actions">
        <label className="switch" title="Use fictional demo businesses instead of the current tab">
          <input
            type="checkbox"
            role="switch"
            checked={settings.demoMode}
            onChange={(e) => void updateSettings({ demoMode: e.target.checked })}
          />
          <span className="switch__track" aria-hidden="true">
            <span className="switch__thumb" />
          </span>
          <span className="switch__label">Demo</span>
        </label>
        <button
          type="button"
          className="btn btn--ghost-inverse btn--sm btn--icon"
          onClick={() => void openDashboard()}
          aria-label="Open full dashboard"
          title="Open full dashboard"
        >
          <LayoutDashboard size={16} aria-hidden="true" />
        </button>
      </div>
    </header>
  )
}
