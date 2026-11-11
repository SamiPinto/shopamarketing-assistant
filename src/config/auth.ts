/**
 * Microsoft (Entra ID) sign-in. Both values come from the app registration's
 * Overview page in the Entra admin center and are not secrets. Set them in .env
 * and rebuild. Until both are set, the extension shows a "not set up" screen.
 */
export const MS_CLIENT_ID = import.meta.env.VITE_MS_CLIENT_ID?.trim() ?? ''
export const MS_TENANT_ID = import.meta.env.VITE_MS_TENANT_ID?.trim() ?? ''
export const AUTH_CONFIGURED = Boolean(MS_CLIENT_ID && MS_TENANT_ID)

/** How long a sign-in lasts before Microsoft is asked again (silently when possible). */
export const SESSION_HOURS = 12
