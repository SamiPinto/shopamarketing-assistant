/** True when running inside an extension page with the chrome.* APIs available. */
export function isExtensionContext(): boolean {
  return typeof chrome !== 'undefined' && Boolean(chrome.runtime?.id) && Boolean(chrome.storage?.local)
}

const BLOCKED_PROTOCOLS = [
  'chrome:',
  'chrome-extension:',
  'chrome-search:',
  'chrome-untrusted:',
  'devtools:',
  'edge:',
  'brave:',
  'opera:',
  'vivaldi:',
  'about:',
  'view-source:',
  'data:',
  'javascript:',
  'blob:',
  'file:',
]

// Chrome blocks script injection on its own web store regardless of permissions.
const BLOCKED_HOSTS = ['chromewebstore.google.com', 'chrome.google.com', 'microsoftedge.microsoft.com']

export type PageEligibility =
  | { ok: true; url: URL }
  | { ok: false; reason: 'internal' | 'restricted' | 'invalid' }

export function checkEligibility(rawUrl: string | undefined): PageEligibility {
  if (!rawUrl) return { ok: false, reason: 'invalid' }
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return { ok: false, reason: 'invalid' }
  }
  if (BLOCKED_PROTOCOLS.includes(url.protocol)) return { ok: false, reason: 'internal' }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return { ok: false, reason: 'restricted' }
  if (BLOCKED_HOSTS.includes(url.hostname)) return { ok: false, reason: 'restricted' }
  return { ok: true, url }
}
