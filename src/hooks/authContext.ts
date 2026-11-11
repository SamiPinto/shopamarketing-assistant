import { createContext, useContext } from 'react'
import type { AuthState } from './useAuth'

export const AuthContext = createContext<AuthState | null>(null)

/** The sign-in state from the nearest AuthGate, or null outside one. */
export function useAuthContext(): AuthState | null {
  return useContext(AuthContext)
}
