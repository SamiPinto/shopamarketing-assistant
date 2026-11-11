import { useCallback, useEffect, useRef, useState } from 'react'
import { AUTH_CONFIGURED } from '../config/auth'
import { getSession, isExpired, onSessionChange, requestSignIn, requestSignOut } from '../services/authService'
import type { AuthSession } from '../types/auth'
import { isExtensionContext } from '../utils/chrome'

export type AuthStatus = 'loading' | 'signed-in' | 'signed-out' | 'unconfigured' | 'not-required'

export interface AuthState {
  status: AuthStatus
  session: AuthSession | null
  busy: boolean
  error: string | null
  signIn(): void
  signOut(): void
}

/** The Microsoft sign-in state, shared by every extension page through chrome.storage. */
export function useAuth(): AuthState {
  // Outside the extension (npm run dev) there is no Microsoft sign-in.
  const required = isExtensionContext()
  const [session, setSession] = useState<AuthSession | null>(null)
  const [loaded, setLoaded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const triedSilent = useRef(false)

  useEffect(() => {
    if (!required || !AUTH_CONFIGURED) return
    let cancelled = false
    void getSession().then(async (saved) => {
      if (cancelled) return
      if (saved && isExpired(saved) && !triedSilent.current) {
        // An expired sign-in renews without a click while the Microsoft session is still active.
        triedSilent.current = true
        setBusy(true)
        const renewed = await requestSignIn(false).catch(() => null)
        if (cancelled) return
        setBusy(false)
        if (!renewed?.ok) {
          await requestSignOut()
          setSession(null)
        }
      } else {
        setSession(saved && !isExpired(saved) ? saved : null)
      }
      setLoaded(true)
    })
    const stop = onSessionChange((next) => setSession(next && !isExpired(next) ? next : null))
    return () => {
      cancelled = true
      stop()
    }
  }, [required])

  const signIn = useCallback(() => {
    if (busy) return
    setBusy(true)
    setError(null)
    void requestSignIn(true)
      .then((result) => {
        if (!result.ok) setError(result.error)
      })
      .catch(() => setError('Microsoft sign-in did not start. Reload the extension and try again.'))
      .finally(() => setBusy(false))
  }, [busy])

  const signOut = useCallback(() => {
    void requestSignOut()
  }, [])

  const status: AuthStatus = !required
    ? 'not-required'
    : !AUTH_CONFIGURED
      ? 'unconfigured'
      : !loaded
        ? 'loading'
        : session
          ? 'signed-in'
          : 'signed-out'

  return { status, session, busy, error, signIn, signOut }
}
