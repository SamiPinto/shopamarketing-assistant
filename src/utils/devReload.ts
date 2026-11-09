/**
 * Dev-only auto reload. `npm run watch` serves a build stamp on localhost and
 * bumps it after every rebuild; when it changes, the extension reloads itself.
 * Production builds never set VITE_DEV_RELOAD, so this is dropped from them.
 */
const STAMP_URL = 'http://127.0.0.1:35729/stamp'
const POLL_MS = 1000
const REOPEN_KEY = 'devReopenTabs'

export const DEV_RELOAD = import.meta.env.VITE_DEV_RELOAD === 'true'
export const DEV_RELOAD_MESSAGE = 'shopa:dev-reload'

/** Calls `onChange` once the stamp differs from the first one seen. */
export function watchBuildStamp(onChange: () => void): void {
  let baseline: string | null = null
  const timer = setInterval(async () => {
    const stamp = await fetch(STAMP_URL, { cache: 'no-store' })
      .then((res) => res.text())
      .catch(() => null)
    if (stamp === null) return
    if (baseline === null) baseline = stamp
    else if (stamp !== baseline) {
      clearInterval(timer)
      onChange()
    }
  }, POLL_MS)
}

/** Extension pages: ask the service worker to reload (it may be asleep, so pages poll too). */
export function startPageDevReload(): void {
  if (!DEV_RELOAD || typeof chrome === 'undefined' || !chrome.runtime?.id) return
  watchBuildStamp(() => void chrome.runtime.sendMessage({ type: DEV_RELOAD_MESSAGE }).catch(() => undefined))
}

/** Service worker: remembers open extension tabs, reloads, then reopens them. */
export function startBackgroundDevReload(): void {
  if (!DEV_RELOAD) return
  let reloading = false
  const reload = async () => {
    if (reloading) return
    reloading = true
    const base = chrome.runtime.getURL('')
    const tabs = await chrome.tabs.query({ url: `${base}*` })
    const urls = tabs.map((t) => t.url).filter((u): u is string => Boolean(u) && !u!.includes('popup.html'))
    await chrome.storage.local.set({ [REOPEN_KEY]: urls })
    chrome.runtime.reload()
  }

  watchBuildStamp(() => void reload())
  chrome.runtime.onMessage.addListener((message: { type?: string }) => {
    if (message?.type === DEV_RELOAD_MESSAGE) void reload()
    return false
  })
  chrome.runtime.onInstalled.addListener(async ({ reason }) => {
    if (reason !== 'update') return
    const { [REOPEN_KEY]: urls } = await chrome.storage.local.get(REOPEN_KEY)
    await chrome.storage.local.remove(REOPEN_KEY)
    for (const url of (urls as string[] | undefined) ?? []) await chrome.tabs.create({ url })
  })
}
