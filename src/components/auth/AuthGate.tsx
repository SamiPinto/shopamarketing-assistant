import type { ReactNode } from 'react'
import { LogOut, TriangleAlert } from 'lucide-react'
import { AuthContext, useAuthContext } from '../../hooks/authContext'
import { useAuth } from '../../hooks/useAuth'
import { redirectUri } from '../../services/authService'
import { BrandLogo, Notice } from '../ui/Primitives'

/** Microsoft's four-square mark, drawn in its own colours as their sign-in buttons require. */
function MicrosoftMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 21 21" aria-hidden="true">
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  )
}

interface Props {
  /** The popup gets a compact screen; the dashboard a full page. */
  variant: 'popup' | 'page'
  children: ReactNode
}

/** Shows the Microsoft sign-in screen until someone from the office has signed in. */
export function AuthGate({ variant, children }: Props) {
  const auth = useAuth()
  if (auth.status === 'not-required' || auth.status === 'signed-in') {
    return <AuthContext.Provider value={auth}>{children}</AuthContext.Provider>
  }

  return (
    <div className={`sign-in sign-in--${variant}`}>
      <div className="sign-in__card">
        <BrandLogo width={variant === 'popup' ? 120 : 150} />
        <h1 className="sign-in__title">Sign in to Marketing Assistant</h1>
        {auth.status === 'loading' ? (
          <p className="sign-in__text">Checking your sign-in…</p>
        ) : auth.status === 'unconfigured' ? (
          <Notice tone="attention" icon={TriangleAlert} title="Microsoft sign-in isn’t set up yet">
            Add VITE_MS_CLIENT_ID and VITE_MS_TENANT_ID to the .env file and rebuild the extension. Register this return
            address in Microsoft Entra as a Single-page application redirect URI: <span className="mono">{redirectUri()}</span>
          </Notice>
        ) : (
          <>
            <p className="sign-in__text">Use your Shopa Marketing Microsoft account. There’s no separate password.</p>
            <button type="button" className="sign-in__button" onClick={auth.signIn} disabled={auth.busy}>
              <MicrosoftMark />
              {auth.busy ? 'Signing in…' : 'Sign in with Microsoft'}
            </button>
            {auth.error && (
              <Notice tone="attention" icon={TriangleAlert}>
                {auth.error}
              </Notice>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/** The signed-in person and a sign-out button, for page headers. Hidden when sign-in isn't used. */
export function AccountMenu({ compact = false }: { compact?: boolean }) {
  const auth = useAuthContext()
  if (!auth?.session) return null
  const { name, email } = auth.session
  return (
    <div className="account">
      {!compact && (
        <span className="account__name" title={email}>
          {name}
        </span>
      )}
      <button
        type="button"
        className={`btn btn--sm btn--icon ${compact ? 'btn--ghost-inverse' : 'btn--ghost'}`}
        onClick={auth.signOut}
        aria-label={`Sign out ${name}`}
        title={`Sign out (${email || name})`}
      >
        <LogOut size={15} aria-hidden="true" />
      </button>
    </div>
  )
}
