import { Component, type ReactNode } from 'react'
import { CircleAlert, RotateCcw } from 'lucide-react'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/Primitives'

interface State {
  error: Error | null
}

/**
 * Keeps one failing module from blanking the whole dashboard. A common cause is
 * a stale tab after the extension was rebuilt/reloaded (lazy chunk no longer exists).
 */
export class ModuleErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <EmptyState
        icon={CircleAlert}
        title="This section couldn't be loaded"
        action={
          <Button variant="primary" icon={RotateCcw} onClick={() => window.location.reload()}>
            Reload dashboard
          </Button>
        }
      >
        If the extension was just updated or reloaded, reloading the dashboard will fix this.
      </EmptyState>
    )
  }
}
