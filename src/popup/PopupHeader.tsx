import { LayoutDashboard } from 'lucide-react'
import { useOpenDashboard } from '../hooks/useOpenDashboard'
import { BrandLogo } from '../components/ui/Primitives'

export function PopupHeader() {
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
