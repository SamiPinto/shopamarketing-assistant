import { EXTRACT_MESSAGE, type ContentRequest, type ContentResponse } from '../types/misc'
import type { PageExtraction, TechItem } from '../types/page'
import { checkEligibility, isExtensionContext, type PageEligibility } from '../utils/chrome'

export type AnalysisErrorCode =
  | 'not-extension'
  | 'no-tab'
  | 'internal'
  | 'restricted'
  | 'no-content-script'
  | 'no-response'
  | 'invalid-url'
  | 'permission-denied'
  | 'failed'

export class AnalysisError extends Error {
  readonly code: AnalysisErrorCode
  constructor(code: AnalysisErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

export interface ActiveTabInfo {
  tabId: number
  url: string
  title: string
  domain: string
  eligibility: PageEligibility
}

const RESPONSE_TIMEOUT_MS = 8000
const PAGE_LOAD_TIMEOUT_MS = 30_000
// Gives client-rendered sites a moment to paint after the load event.
const RENDER_SETTLE_MS = 1500
const CONTENT_SCRIPT_FILE = 'content.js'

/**
 * Runs in the page's own JavaScript world, which the content script can't see.
 * React leaves its internal keys on the elements it renders, so look for those.
 * Self-contained because Chrome serialises it into the page.
 */
function probeReact(): string | boolean {
  const version = (window as unknown as { React?: { version?: unknown } }).React?.version
  if (typeof version === 'string') return version
  const elements = [document.body, ...Array.from(document.querySelectorAll('body *')).slice(0, 300)]
  return elements.some((el) =>
    Object.keys(el).some((k) => k.startsWith('__reactFiber$') || k.startsWith('__reactContainer$') || k === '_reactRootContainer'),
  )
}

/** Adds React to the tech stack when the page uses it. Never fails the scan. */
async function withReact(tabId: number, data: PageExtraction): Promise<PageExtraction> {
  if (data.tech.some((t) => t.name === 'React')) return data
  try {
    const [injection] = await chrome.scripting.executeScript({ target: { tabId }, world: 'MAIN', func: probeReact })
    const found = injection?.result
    if (!found) return data
    const react: TechItem = { name: 'React', category: 'framework', version: typeof found === 'string' ? found : null, outdated: false }
    return { ...data, tech: [...data.tech, react] }
  } catch {
    return data
  }
}

export const tabService = {
  async getActiveTab(): Promise<ActiveTabInfo | null> {
    if (!isExtensionContext() || !chrome.tabs) return null
    const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true })
    if (!tab?.id) return null
    const url = tab.url ?? tab.pendingUrl ?? ''
    const eligibility = checkEligibility(url)
    return {
      tabId: tab.id,
      url,
      title: tab.title ?? '',
      domain: eligibility.ok ? eligibility.url.hostname.replace(/^www\./, '') : url.split('/')[0],
      eligibility,
    }
  },

  /** Injects the content script into the tab (activeTab grant) and requests an extraction. */
  async extractPage(tab: ActiveTabInfo): Promise<PageExtraction> {
    if (!isExtensionContext()) {
      throw new AnalysisError('not-extension', 'Live analysis is only available inside the Chrome extension.')
    }
    if (!tab.eligibility.ok) {
      throw new AnalysisError(
        tab.eligibility.reason === 'internal' ? 'internal' : 'restricted',
        "This page can't be analysed.",
      )
    }

    try {
      await chrome.scripting.executeScript({ target: { tabId: tab.tabId }, files: [CONTENT_SCRIPT_FILE] })
    } catch (error) {
      throw new AnalysisError(
        'restricted',
        `Chrome blocked access to this page. ${error instanceof Error ? error.message : ''}`.trim(),
      )
    }

    const request: ContentRequest = { type: EXTRACT_MESSAGE }
    let response: ContentResponse | undefined
    try {
      response = await withTimeout(
        chrome.tabs.sendMessage<ContentRequest, ContentResponse>(tab.tabId, request),
        RESPONSE_TIMEOUT_MS,
      )
    } catch (error) {
      if (error instanceof AnalysisError) throw error
      throw new AnalysisError('no-content-script', 'The page scanner could not connect to this page.')
    }

    if (!response) throw new AnalysisError('no-content-script', 'The page scanner returned no data.')
    if (!response.ok) throw new AnalysisError('failed', response.error)
    return withReact(tab.tabId, response.data)
  },

  /**
   * Opens the URL in a background tab, waits for it to load, extracts it and
   * closes the tab again. Needs host permission for the URL's origin.
   */
  async extractUrl(url: string): Promise<PageExtraction> {
    if (!isExtensionContext()) {
      throw new AnalysisError('not-extension', 'Live analysis is only available inside the Chrome extension.')
    }
    const created = await chrome.tabs.create({ url, active: false })
    const tabId = created.id
    if (tabId === undefined) throw new AnalysisError('no-tab', 'Could not open the website.')
    try {
      const loaded = await waitForTabLoad(tabId, PAGE_LOAD_TIMEOUT_MS)
      await new Promise((resolve) => setTimeout(resolve, RENDER_SETTLE_MS))
      const finalUrl = loaded.url ?? url
      const eligibility = checkEligibility(finalUrl)
      return await this.extractPage({
        tabId,
        url: finalUrl,
        title: loaded.title ?? '',
        domain: eligibility.ok ? eligibility.url.hostname.replace(/^www\./, '') : finalUrl,
        eligibility,
      })
    } finally {
      await chrome.tabs.remove(tabId).catch(() => undefined)
    }
  },
}

/** Normalises user input ("example.com.au") into an analysable http(s) URL, or null. */
export function normaliseInputUrl(input: string): URL | null {
  const trimmed = input.trim()
  if (!trimmed) return null
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(trimmed) ? trimmed : `https://${trimmed}`
  const eligibility = checkEligibility(withScheme)
  if (!eligibility.ok || !eligibility.url.hostname.includes('.')) return null
  return eligibility.url
}

function waitForTabLoad(tabId: number, ms: number): Promise<chrome.tabs.Tab> {
  return new Promise((resolve, reject) => {
    const finish = (fn: () => void) => {
      clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.tabs.onRemoved.removeListener(onRemoved)
      fn()
    }
    const onUpdated = (id: number, info: { status?: string }, tab: chrome.tabs.Tab) => {
      if (id === tabId && info.status === 'complete') finish(() => resolve(tab))
    }
    const onRemoved = (id: number) => {
      if (id === tabId) finish(() => reject(new AnalysisError('no-tab', 'The website tab was closed before it loaded.')))
    }
    const timer = setTimeout(
      () => finish(() => reject(new AnalysisError('no-response', 'The website did not finish loading in time.'))),
      ms,
    )
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onRemoved.addListener(onRemoved)
    // The tab may already be complete (e.g. served from cache) before we started listening.
    void chrome.tabs.get(tabId).then(
      (tab) => tab.status === 'complete' && finish(() => resolve(tab)),
      () => undefined,
    )
  })
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new AnalysisError('no-response', 'The website did not respond in time.')),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error: unknown) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}
