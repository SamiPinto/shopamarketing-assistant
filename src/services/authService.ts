import { MS_CLIENT_ID, MS_TENANT_ID, SESSION_HOURS } from '../config/auth'
import type { AuthRequest, AuthResponse, AuthSession } from '../types/auth'
import { isExtensionContext } from '../utils/chrome'

/**
 * Microsoft sign-in for the extension: the OAuth 2.0 authorization-code flow
 * with PKCE (no client secret), run through chrome.identity.launchWebAuthFlow.
 * The flow runs in the service worker, because the popup closes as soon as the
 * Microsoft window takes focus. Only the account's name and email are kept.
 */

const SESSION_KEY = 'authSession'
const AUTHORITY = `https://login.microsoftonline.com/${MS_TENANT_ID}/oauth2/v2.0`
const SCOPES = 'openid profile email'

/** The address Microsoft returns to; it must be registered as a Single-page application redirect URI. */
export function redirectUri(): string {
  return isExtensionContext() ? chrome.identity.getRedirectURL() : ''
}

export async function getSession(): Promise<AuthSession | null> {
  if (!isExtensionContext()) return null
  const { [SESSION_KEY]: session } = await chrome.storage.local.get(SESSION_KEY)
  return (session as AuthSession | undefined) ?? null
}

export function isExpired(session: AuthSession): boolean {
  return Date.parse(session.expiresAt) <= Date.now()
}

/** Calls back whenever the session changes, in any extension page. */
export function onSessionChange(listener: (session: AuthSession | null) => void): () => void {
  if (!isExtensionContext()) return () => undefined
  const handle = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
    if (area === 'local' && SESSION_KEY in changes) listener((changes[SESSION_KEY].newValue as AuthSession | undefined) ?? null)
  }
  chrome.storage.onChanged.addListener(handle)
  return () => chrome.storage.onChanged.removeListener(handle)
}

/** From a page: asks the service worker to sign in. Silent sign-in fails quietly when Microsoft needs the person. */
export async function requestSignIn(interactive: boolean): Promise<AuthResponse> {
  const request: AuthRequest = { type: 'shopa:sign-in', interactive }
  return ((await chrome.runtime.sendMessage(request)) as AuthResponse | undefined) ?? { ok: false, error: 'Sign-in did not respond.' }
}

export async function requestSignOut(): Promise<void> {
  const request: AuthRequest = { type: 'shopa:sign-out' }
  await chrome.runtime.sendMessage(request)
}

/* ---------------- Service worker side ---------------- */

const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
const randomString = () => base64Url(crypto.getRandomValues(new Uint8Array(32)))

async function challengeFor(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
  return base64Url(new Uint8Array(digest))
}

function decodeJwt(token: string): Record<string, unknown> {
  const payload = token.split('.')[1] ?? ''
  const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'))
  return JSON.parse(decodeURIComponent(Array.from(json, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, '0')}`).join(''))) as Record<
    string,
    unknown
  >
}

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Plain-English messages for the Microsoft errors people are likely to hit. */
function explain(code: string, description: string): string {
  if (code === 'access_denied' || /AADSTS65004/.test(description)) return 'Sign-in was cancelled.'
  if (/AADSTS50011/.test(description)) {
    return `The sign-in return address isn’t registered. In Microsoft Entra, add ${redirectUri()} as a Single-page application redirect URI.`
  }
  if (/AADSTS9002326|AADSTS9002327/.test(description)) {
    return `In Microsoft Entra, the return address ${redirectUri()} must be under the “Single-page application” platform, not Web or Mobile.`
  }
  if (/AADSTS50105/.test(description)) return 'Your Microsoft account isn’t allowed to use this app yet. Ask IT to add you to it.'
  if (/AADSTS700016|AADSTS90002/.test(description)) return 'The Microsoft app or tenant ID in the extension is wrong. Check VITE_MS_CLIENT_ID and VITE_MS_TENANT_ID.'
  if (/AADSTS50020|AADSTS500200/.test(description)) return 'Use your Shopa Marketing work account, not a personal or guest Microsoft account.'
  return description.split('\n')[0]?.replace(/^AADSTS\d+:\s*/, '') || 'Microsoft sign-in failed.'
}

class SignInError extends Error {}

/** Runs the whole sign-in and stores the session. Throws SignInError with a readable message. */
async function signIn(interactive: boolean): Promise<AuthSession> {
  const redirect = redirectUri()
  const verifier = randomString()
  const state = randomString()
  const nonce = randomString()
  const params = new URLSearchParams({
    client_id: MS_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirect,
    response_mode: 'query',
    scope: SCOPES,
    state,
    nonce,
    code_challenge: await challengeFor(verifier),
    code_challenge_method: 'S256',
    prompt: interactive ? 'select_account' : 'none',
  })

  let returned: string | undefined
  try {
    returned = await chrome.identity.launchWebAuthFlow({ url: `${AUTHORITY}/authorize?${params}`, interactive })
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    throw new SignInError(/did not approve|canceled|cancelled|closed/i.test(message) ? 'Sign-in was cancelled.' : message)
  }
  if (!returned) throw new SignInError('Sign-in was cancelled.')

  const query = new URL(returned).searchParams
  if (query.get('error')) throw new SignInError(explain(query.get('error') ?? '', query.get('error_description') ?? ''))
  if (query.get('state') !== state) throw new SignInError('Sign-in could not be confirmed. Please try again.')
  const code = query.get('code')
  if (!code) throw new SignInError('Microsoft did not return a sign-in code.')

  const response = await fetch(`${AUTHORITY}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: MS_CLIENT_ID,
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirect,
      code_verifier: verifier,
      scope: SCOPES,
    }),
  })
  const tokens = (await response.json().catch(() => ({}))) as { id_token?: string; error?: string; error_description?: string }
  if (!response.ok || !tokens.id_token) throw new SignInError(explain(tokens.error ?? '', tokens.error_description ?? 'Microsoft sign-in failed.'))

  // The token came straight from Microsoft over HTTPS in exchange for our one-time code; check it is ours.
  const claims = decodeJwt(tokens.id_token)
  if (claims.aud !== MS_CLIENT_ID || claims.nonce !== nonce) throw new SignInError('Sign-in could not be confirmed. Please try again.')
  if (GUID.test(MS_TENANT_ID) && claims.tid !== MS_TENANT_ID) {
    throw new SignInError('Use your Shopa Marketing work account, not one from another organisation.')
  }

  const now = Date.now()
  const session: AuthSession = {
    name: String(claims.name ?? claims.preferred_username ?? 'Signed in'),
    email: String(claims.email ?? claims.preferred_username ?? ''),
    userId: String(claims.oid ?? ''),
    tenantId: String(claims.tid ?? ''),
    signedInAt: new Date(now).toISOString(),
    expiresAt: new Date(now + SESSION_HOURS * 3600_000).toISOString(),
  }
  await chrome.storage.local.set({ [SESSION_KEY]: session })
  return session
}

/** Registers the service worker's sign-in and sign-out messages. */
export function handleAuthMessages(): void {
  chrome.runtime.onMessage.addListener((message: AuthRequest, _sender, sendResponse: (response: AuthResponse) => void) => {
    if (message?.type === 'shopa:sign-in') {
      signIn(message.interactive)
        .then(() => sendResponse({ ok: true }))
        .catch((e: unknown) => sendResponse({ ok: false, error: e instanceof Error ? e.message : 'Microsoft sign-in failed.' }))
      return true
    }
    if (message?.type === 'shopa:sign-out') {
      chrome.storage.local
        .remove(SESSION_KEY)
        .then(() => sendResponse({ ok: true }))
        .catch(() => sendResponse({ ok: true }))
      return true
    }
    return false
  })
}
