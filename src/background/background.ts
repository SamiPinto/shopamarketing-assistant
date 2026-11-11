/**
 * MV3 service worker. Kept intentionally small: it seeds default settings on
 * install, runs Microsoft sign-in and opens (or focuses) the full dashboard tab.
 * Page extraction runs from the popup using the activeTab grant.
 */
import { handleAuthMessages } from '../services/authService'
import { DEFAULT_SETTINGS, type OpenDashboardRequest } from '../types/misc'
import { startBackgroundDevReload } from '../utils/devReload'

startBackgroundDevReload()
handleAuthMessages()

chrome.runtime.onInstalled.addListener(async ({ reason }) => {
  if (reason !== 'install') return
  const { settings } = await chrome.storage.local.get('settings')
  if (!settings) await chrome.storage.local.set({ settings: DEFAULT_SETTINGS })
})

async function openDashboard(section?: string): Promise<void> {
  const base = chrome.runtime.getURL('dashboard.html')
  const url = section ? `${base}#${section}` : base
  const [existing] = await chrome.tabs.query({ url: `${base}*` })
  if (existing?.id !== undefined) {
    await chrome.tabs.update(existing.id, { active: true, url })
    if (existing.windowId !== undefined) await chrome.windows.update(existing.windowId, { focused: true })
    return
  }
  await chrome.tabs.create({ url })
}

chrome.runtime.onMessage.addListener((message: OpenDashboardRequest, _sender, sendResponse) => {
  if (message?.type !== 'shopa:open-dashboard') return false
  openDashboard(message.section)
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => sendResponse({ ok: false, error: String(error) }))
  return true // keep the channel open for the async response
})
