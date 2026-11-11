/** The signed-in Microsoft account, from its ID token. */
export interface AuthSession {
  name: string
  email: string
  /** Entra object id of the user. */
  userId: string
  tenantId: string
  signedInAt: string
  expiresAt: string
}

export type AuthRequest = { type: 'shopa:sign-in'; interactive: boolean } | { type: 'shopa:sign-out' }

export type AuthResponse = { ok: true } | { ok: false; error: string }
