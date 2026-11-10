import type { KeywordProgress, KeywordRanking, SerpResult } from '../types/keywords'
import { isExtensionContext } from '../utils/chrome'
import { isDirectoryDomain, matchesDomain, rootDomain } from '../data/directories'

/**
 * Reads live Google results the same way a salesperson would: by opening the
 * search in a (background) browser tab and reading the organic results. This
 * keeps it free and keyless but means it must stay low volume, so searches are
 * spaced out and a CAPTCHA is handed to the person to complete. Searches use
 * the Google of the business's country (google.co.uk, google.ca, …).
 */

/** Which Google to search: the business's country, or worldwide google.com. */
export interface SearchMarket {
  googleHost: string
  /** Google country code (gl); empty for worldwide. */
  gl: string
}

const RESULTS_PER_PAGE = 10
const LOAD_TIMEOUT_MS = 20_000
const SETTLE_MS = 700
const GAP_MIN_MS = 3000
const GAP_MAX_MS = 6000
// How long to wait for the salesperson to complete a Google CAPTCHA.
const CAPTCHA_WAIT_MS = 180_000

export class GoogleBlockedError extends Error {}

// CAPTCHA pages are served from www.google.com whichever country Google is used.
function originsFor(market: SearchMarket): string[] {
  return [...new Set([`https://${market.googleHost}/*`, 'https://www.google.com/*'])]
}

function params(market: SearchMarket): string {
  return `hl=en${market.gl ? `&gl=${market.gl}` : ''}`
}

/** Must be called synchronously from a click so Chrome can show the prompt. */
export function requestGoogleAccess(market: SearchMarket): Promise<boolean> {
  if (!isExtensionContext()) return Promise.resolve(false)
  return chrome.permissions.request({ origins: originsFor(market) }).catch(() => false)
}

/** Google Autocomplete suggestions for a query in that country. Never throws. */
export async function autocomplete(query: string, market: SearchMarket): Promise<string[]> {
  try {
    const url = `https://${market.googleHost}/complete/search?client=chrome&${params(market)}&q=${encodeURIComponent(query)}`
    const response = await fetch(url, { credentials: 'omit' })
    if (!response.ok) return []
    const data = (await response.json()) as [string, string[]]
    return Array.isArray(data?.[1]) ? data[1].filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

interface SerpPage {
  blocked: 'captcha' | 'consent' | null
  results: { url: string; title: string; display: string }[]
}

/**
 * Runs inside the Google tab. Organic results are links that wrap an h3;
 * ads (#tads, #bottomads) are skipped. Google routes result links through an
 * opaque redirect (/goto?url=…), so the site comes from the green address
 * line (<cite>) shown under each title, e.g. "https://site.com.au › services".
 * Self-contained because Chrome serialises it into the page.
 */
function readSerp(): SerpPage {
  if (location.hostname.startsWith('consent.')) return { blocked: 'consent', results: [] }
  if (location.pathname.startsWith('/sorry') || document.querySelector('#captcha-form, iframe[src*="recaptcha"]')) {
    return { blocked: 'captcha', results: [] }
  }
  const isGoogle = (host: string) => /(^|\.)google\.[a-z.]+$/.test(host)
  const root = document.querySelector('#rso') ?? document.querySelector('#search') ?? document.body
  const seen = new Set<string>()
  const results: SerpPage['results'] = []
  for (const heading of Array.from(root.querySelectorAll('a h3'))) {
    const link = heading.closest('a')
    if (!link || link.closest('#tads, #bottomads')) continue

    // Climb to this result's own block (stop before it would include another result).
    let box: Element = link
    let cite: Element | null = null
    while (!cite && box.parentElement && box.parentElement !== root && box.parentElement.querySelectorAll('a h3').length === 1) {
      box = box.parentElement
      cite = box.querySelector('cite')
    }
    const display = (cite?.textContent ?? '').replace(/\s+/g, ' ').trim()

    let url = link.href
    try {
      if (isGoogle(new URL(url).hostname)) {
        const origin = display.split('›')[0]?.trim() ?? ''
        if (!/^https?:\/\/[^\s/]+\.[a-z]{2,}/i.test(origin) || isGoogle(new URL(origin).hostname)) continue
        url = origin
      }
    } catch {
      continue
    }
    const title = (heading.textContent ?? '').trim()
    if (seen.has(url + title)) continue
    seen.add(url + title)
    results.push({ url, title, display })
  }
  return { blocked: null, results }
}

/** Resolves once the tab has started and finished a new navigation. */
function navigate(tabId: number, url: string): Promise<void> {
  return new Promise((resolve, reject) => {
    let started = false
    const finish = (fn: () => void) => {
      clearTimeout(timer)
      chrome.tabs.onUpdated.removeListener(onUpdated)
      chrome.tabs.onRemoved.removeListener(onRemoved)
      fn()
    }
    const onUpdated = (id: number, info: { status?: string }) => {
      if (id !== tabId) return
      if (info.status === 'loading') started = true
      else if (info.status === 'complete' && started) finish(resolve)
    }
    const onRemoved = (id: number) => {
      if (id === tabId) finish(() => reject(new Error('The Google tab was closed.')))
    }
    const timer = setTimeout(() => finish(() => reject(new Error('Google did not load in time.'))), LOAD_TIMEOUT_MS)
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onRemoved.addListener(onRemoved)
    chrome.tabs.update(tabId, { url }).catch((error: unknown) => finish(() => reject(error)))
  })
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
const gap = () => sleep(GAP_MIN_MS + Math.random() * (GAP_MAX_MS - GAP_MIN_MS))

function searchUrl(keyword: string, page: number, market: SearchMarket): string {
  const start = page * RESULTS_PER_PAGE
  return `https://${market.googleHost}/search?q=${encodeURIComponent(keyword)}&${params(market)}&pws=0${start ? `&start=${start}` : ''}`
}

/**
 * Brings the Google tab to the front so the person can complete the CAPTCHA
 * themselves, waits until Google lets them through, then returns to the
 * dashboard tab. Resolves false on timeout, stop or a closed tab.
 */
async function waitForHuman(tabId: number, signal: AbortSignal): Promise<boolean> {
  const home = await chrome.tabs.getCurrent().catch(() => undefined)
  const google = await chrome.tabs.update(tabId, { active: true }).catch(() => undefined)
  if (google?.windowId !== undefined) await chrome.windows.update(google.windowId, { focused: true }).catch(() => undefined)
  const deadline = Date.now() + CAPTCHA_WAIT_MS
  try {
    while (Date.now() < deadline && !signal.aborted) {
      await sleep(1000)
      const tab = await chrome.tabs.get(tabId).catch(() => null)
      if (!tab) return false
      if (tab.status === 'complete' && tab.url && !tab.url.includes('/sorry/')) return true
    }
    return false
  } finally {
    if (home?.id !== undefined) await chrome.tabs.update(home.id, { active: true }).catch(() => undefined)
  }
}

async function readPage(tabId: number, keyword: string, page: number, market: SearchMarket): Promise<SerpPage> {
  await navigate(tabId, searchUrl(keyword, page, market))
  await sleep(SETTLE_MS)
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func: readSerp })
  return (injection?.result as SerpPage | undefined) ?? { blocked: null, results: [] }
}

export interface RankCheckOptions {
  domain: string
  market: SearchMarket
  keywords: Pick<KeywordRanking, 'keyword' | 'service' | 'place' | 'source'>[]
  /** Result pages to read per keyword when the site isn't found sooner (1–3). */
  maxPages: number
  signal: AbortSignal
  onProgress(progress: KeywordProgress): void
  onKeyword(ranking: KeywordRanking): void
  /** Called with true while waiting for the person to complete a CAPTCHA. */
  onCaptcha(waiting: boolean): void
}

/**
 * Checks each keyword on Google. Page 1 is always read (it defines the
 * competitors); later pages only while the site hasn't been found.
 * Returns a stop reason when Google blocked the run, otherwise null.
 */
export async function checkRankings(options: RankCheckOptions): Promise<string | null> {
  const { domain, market, keywords, maxPages, signal, onProgress, onKeyword, onCaptcha } = options
  const tab = await chrome.tabs.create({ url: 'about:blank', active: false })
  const tabId = tab.id
  if (tabId === undefined) throw new Error('Could not open a Google tab.')

  try {
    for (const [index, query] of keywords.entries()) {
      const { keyword } = query
      const results: SerpResult[] = []
      let pagesChecked = 0
      let error: string | null = null

      for (let page = 0; page < maxPages; page++) {
        if (signal.aborted) return 'Stopped before all keywords were checked.'
        onProgress({ done: index, total: keywords.length, keyword, page: page + 1 })
        if (index > 0 || page > 0) await gap()
        let serp: SerpPage
        try {
          serp = await readPage(tabId, keyword, page, market)
        } catch (e) {
          error = e instanceof Error ? e.message : 'Google could not be read.'
          break
        }
        if (serp.blocked === 'captcha') {
          onCaptcha(true)
          const solved = await waitForHuman(tabId, signal)
          onCaptcha(false)
          if (!solved) {
            throw new GoogleBlockedError(
              signal.aborted
                ? 'Stopped before all keywords were checked.'
                : 'Google asked to confirm you are human and it was not completed, so checking stopped. Results so far are kept; check the rest later.',
            )
          }
          page-- // Read the same page again now Google has let us through.
          continue
        }
        if (serp.blocked === 'consent') {
          throw new GoogleBlockedError("Google showed its cookie notice. Open google.com.au in a normal tab, accept it, then check again.")
        }
        pagesChecked++
        for (const r of serp.results) {
          const resultDomain = rootDomain(r.url)
          results.push({
            position: results.length + 1,
            page: page + 1,
            url: r.url,
            display: r.display,
            domain: resultDomain,
            title: r.title,
            directory: isDirectoryDomain(resultDomain),
          })
        }
        if (page === 0 && serp.results.length === 0) {
          error = 'No results could be read from Google for this keyword.'
          break
        }
        if (results.some((r) => matchesDomain(r.domain, domain))) break
      }

      const own = results.find((r) => matchesDomain(r.domain, domain)) ?? null
      onKeyword({
        ...query,
        pagesChecked,
        position: own?.position ?? null,
        rankingUrl: own?.url ?? null,
        rankingDisplay: own?.display ?? null,
        results,
        error,
      })
    }
    return null
  } catch (e) {
    if (e instanceof GoogleBlockedError) return e.message
    throw e
  } finally {
    await chrome.tabs.remove(tabId).catch(() => undefined)
  }
}
