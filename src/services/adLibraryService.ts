import type { AdLibraryId, AdLibraryResult, AdsProgress, AdsReport } from '../types/ads'
import { isExtensionContext } from '../utils/chrome'

/**
 * Counts a business's ads in the public ad libraries (Google Ads Transparency
 * Center, Meta Ad Library, LinkedIn Ad Library). None has a free API for this,
 * so each library is opened in a background tab and its page is read, the way a
 * salesperson would look it up. Google is searched by website (every account
 * advertising it), Meta by website keyword and LinkedIn by business name; for
 * those two, ads from other advertisers that merely mention the name are left out.
 */

const ORIGINS = ['https://adstransparency.google.com/*', 'https://www.facebook.com/*', 'https://www.linkedin.com/*']
const LOAD_TIMEOUT_MS = 25_000
// Google shows the first 40 ads of a search; beyond that only its rounded total is known.
const GOOGLE_PAGE_SIZE = 40
const GOOGLE_PLATFORMS = [
  { id: 'SEARCH', label: 'Google Search' },
  { id: 'YOUTUBE', label: 'YouTube' },
  { id: 'MAPS', label: 'Google Maps' },
  { id: 'SHOPPING', label: 'Google Shopping' },
  { id: 'PLAY', label: 'Google Play' },
]

export const AD_LIBRARY_LABEL: Record<AdLibraryId, string> = {
  google: 'Google Ads',
  meta: 'Meta (Facebook & Instagram)',
  linkedin: 'LinkedIn',
}

/** Must be called synchronously from a click so Chrome can show the prompt. */
export function requestAdLibraryAccess(): Promise<boolean> {
  if (!isExtensionContext()) return Promise.resolve(false)
  return chrome.permissions.request({ origins: ORIGINS }).catch(() => false)
}

/** What a library page showed: its own total and the advertiser name on each ad loaded. */
interface LibraryPage {
  state: 'ok' | 'none' | 'blocked' | 'empty'
  label: string | null
  names: string[]
}

/*
 * Page readers run inside the library tab, so each is self-contained (Chrome
 * serialises it). They wait for the app to render, since all three build the
 * page with JavaScript after load.
 */

/**
 * Google, filtered to a date range: lists up to 40 ads (its total then always
 * reads "0 ads", so the ads themselves are counted).
 */
async function readGoogleLibrary(): Promise<LibraryPage> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const start = Date.now()
  let seen = 0
  let stableSince = 0
  for (;;) {
    const text = document.body?.innerText ?? ''
    if (/No ads found/i.test(text)) return { state: 'none', label: null, names: [] }
    const cards = Array.from(document.querySelectorAll('creative-preview'))
    if (cards.length !== seen) {
      seen = cards.length
      stableSince = Date.now()
    }
    const elapsed = Date.now() - start
    if ((cards.length > 0 && Date.now() - stableSince > 2000) || (cards.length > 0 && elapsed > 18_000)) {
      const names = cards.map((card) => {
        const lines = (card as HTMLElement).innerText.split('\n').map((l) => l.trim()).filter(Boolean)
        const verified = lines.lastIndexOf('Verified')
        return (verified > 0 ? lines[verified - 1] : lines[lines.length - 1]) ?? ''
      })
      return { state: 'ok', label: null, names }
    }
    if (elapsed > 18_000) return { state: 'empty', label: null, names: [] }
    await sleep(500)
  }
}

/** Google, with no date filter: its rounded all-time total, e.g. "~300 ads". */
async function readGoogleTotal(): Promise<LibraryPage> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const start = Date.now()
  for (;;) {
    const text = document.body?.innerText ?? ''
    if (/No ads found/i.test(text)) return { state: 'none', label: null, names: [] }
    const match = text.match(/(~?\d[\d.,]*\s?[KM]?)\+? ads?\b/)
    if (match && !/^0$/.test(match[1].trim())) return { state: 'ok', label: match[1].trim(), names: [] }
    if (Date.now() - start > 10_000) return { state: 'empty', label: null, names: [] }
    await sleep(500)
  }
}

async function readMetaLibrary(): Promise<LibraryPage> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const start = Date.now()
  const namesOf = (text: string) => Array.from(text.matchAll(/See (?:ad|summary) details\n([^\n]+)\nSponsored/g), (m) => m[1].trim())
  for (;;) {
    const text = document.body?.innerText ?? ''
    if (/No ads match your search/i.test(text)) return { state: 'none', label: null, names: [] }
    const label = text.match(/(~?\d[\d.,]*\s?[KM]?) results?\b/)?.[1]?.trim() ?? null
    if (label) {
      // About 30 ads load at a time; scroll a few times so the advertiser split rests on more of them.
      let names = namesOf(text)
      for (let i = 0; i < 3 && names.length < 120; i++) {
        window.scrollTo(0, document.body.scrollHeight)
        await sleep(2000)
        const more = namesOf(document.body.innerText)
        if (more.length <= names.length) break
        names = more
      }
      return { state: 'ok', label, names }
    }
    if (Date.now() - start > 18_000) {
      const blocked = /log in to continue|allow all cookies|decline optional cookies/i.test(text)
      return { state: blocked ? 'blocked' : 'empty', label: null, names: [] }
    }
    await sleep(500)
  }
}

async function readLinkedInLibrary(): Promise<LibraryPage> {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))
  const start = Date.now()
  for (;;) {
    if (/authwall|\/login|\/checkpoint/.test(location.pathname)) return { state: 'blocked', label: null, names: [] }
    const text = document.querySelector('main')?.innerText ?? document.body?.innerText ?? ''
    if (/No ads match/i.test(text)) return { state: 'none', label: null, names: [] }
    const label = text.match(/(\d[\d,]*) ads? match/)?.[1] ?? null
    if (label) {
      // Each ad starts with the advertiser's name, then "Promoted".
      const names = Array.from(text.matchAll(/(?:^|\n)([^\n]+)\n+Promoted\n/g), (m) => m[1].trim())
      return { state: 'ok', label, names }
    }
    if (Date.now() - start > 15_000) return { state: 'empty', label: null, names: [] }
    await sleep(500)
  }
}

/** Resolves once the tab has started and finished loading `url`. */
function load(tabId: number, url: string): Promise<void> {
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
      if (id === tabId) finish(() => reject(new Error('The ad library tab was closed.')))
    }
    const timer = setTimeout(() => finish(() => reject(new Error('The ad library did not load in time.'))), LOAD_TIMEOUT_MS)
    chrome.tabs.onUpdated.addListener(onUpdated)
    chrome.tabs.onRemoved.addListener(onRemoved)
    chrome.tabs.update(tabId, { url }).catch((error: unknown) => finish(() => reject(error)))
  })
}

async function readLibrary(tabId: number, url: string, reader: () => Promise<LibraryPage>): Promise<LibraryPage> {
  await load(tabId, url)
  const [injection] = await chrome.scripting.executeScript({ target: { tabId }, func: reader })
  return (injection?.result as LibraryPage | undefined) ?? { state: 'empty', label: null, names: [] }
}

/** "~2K" → 2000, "1,234" → 1234. */
function parseCount(label: string | null): number | null {
  if (!label) return null
  const match = label.replace(/[~,\s]/g, '').match(/^(\d+(?:\.\d+)?)([KM]?)$/i)
  if (!match) return null
  const scale = match[2].toUpperCase() === 'M' ? 1_000_000 : match[2].toUpperCase() === 'K' ? 1000 : 1
  return Math.round(Number(match[1]) * scale)
}

const compact = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '')

/** Whether an advertiser name belongs to the business (its name or the name in its domain). */
function ownMatcher(businessName: string, domain: string): (advertiser: string) => boolean {
  const tokens = [compact(businessName), compact(domain.replace(/^www\./, '').split('.')[0] ?? '')].filter((t) => t.length >= 4)
  return (advertiser) => {
    const name = compact(advertiser)
    return name.length >= 4 && tokens.some((t) => name.includes(t) || t.includes(name))
  }
}

function topAdvertisers(names: string[]): string[] {
  const counts = new Map<string, number>()
  for (const n of names) if (n) counts.set(n, (counts.get(n) ?? 0) + 1)
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n]) => n)
}

const failed = (library: AdLibraryId, libraryUrl: string, error: string): AdLibraryResult => ({
  library,
  count: null,
  approximate: false,
  atLeast: false,
  advertisers: [],
  libraryUrl,
  error,
})

const blockedMessage = (page: LibraryPage, name: string) =>
  page.state === 'blocked'
    ? `${name} asked you to log in or accept cookies. Open the library link once in a normal tab, then check again.`
    : `${name} didn’t show any results in time. Open the library link to look yourself.`

/** Google: every ad pointing at the website, whoever's account ran it. A full page of 40 means “40 or more”. */
function googleCount(page: LibraryPage): { count: number; approximate: boolean; atLeast: boolean } {
  if (page.state === 'none') return { count: 0, approximate: false, atLeast: false }
  const loaded = page.names.length
  return { count: loaded, approximate: false, atLeast: loaded >= GOOGLE_PAGE_SIZE }
}

/** Meta and LinkedIn: the business's share of the matching ads. */
function ownCount(page: LibraryPage, isOwn: (name: string) => boolean): { count: number; approximate: boolean; own: string[] } {
  if (page.state === 'none') return { count: 0, approximate: false, own: [] }
  const own = page.names.filter(isOwn)
  const loaded = page.names.length
  const total = parseCount(page.label) ?? loaded
  if (loaded === 0) return { count: 0, approximate: true, own }
  if (loaded >= total) return { count: own.length, approximate: false, own }
  return { count: Math.round((total * own.length) / loaded), approximate: true, own }
}

/** Ads for the website shown in the last 30 days, optionally on one Google platform; `allTime` drops the date filter. */
export function googleLibraryUrl(domain: string, country: string | null, platform?: string, allTime = false): string {
  const region = country ? `region=${country}&` : ''
  const period = allTime ? '' : '&preset-date=Last+30+days'
  return `https://adstransparency.google.com/?${region}domain=${encodeURIComponent(domain)}${period}${platform ? `&platform=${platform}` : ''}`
}

export function metaLibraryUrl(domain: string, country: string | null): string {
  return `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=${country ?? 'ALL'}&q=${encodeURIComponent(domain)}&search_type=keyword_unordered&media_type=all`
}

export function linkedInLibraryUrl(businessName: string): string {
  return `https://www.linkedin.com/ad-library/search?accountOwner=${encodeURIComponent(businessName)}&dateOption=last-30-days`
}

export interface AdCheckOptions {
  domain: string
  businessName: string
  /** MarketCode, or null to search all countries. */
  country: string | null
  signal: AbortSignal
  onProgress(progress: AdsProgress): void
}

export async function checkAdLibraries(options: AdCheckOptions): Promise<AdsReport> {
  const { domain, businessName, country, signal, onProgress } = options
  const isOwn = ownMatcher(businessName, domain)
  const results: AdLibraryResult[] = []
  const tab = await chrome.tabs.create({ url: 'about:blank', active: false })
  const tabId = tab.id
  if (tabId === undefined) throw new Error('Could not open a tab for the ad libraries.')
  // Google's all-time total and per-platform split add pages, but only when there are ads at all.
  let total = 3
  let done = 0
  const step = (name: string) => onProgress({ done: done++, total, step: name })

  try {
    // Google Ads Transparency Center
    const googleUrl = googleLibraryUrl(domain, country)
    step('Google Ads Transparency Center')
    try {
      const page = await readLibrary(tabId, googleUrl, readGoogleLibrary)
      if (page.state === 'blocked' || page.state === 'empty') {
        results.push(failed('google', googleUrl, blockedMessage(page, 'Google')))
      } else {
        const counted = googleCount(page)
        const byPlatform: AdLibraryResult['byPlatform'] = []
        let allTime: string | null = null
        if (counted.count > 0) {
          total += 1 + GOOGLE_PLATFORMS.length
          step('Google all-time total')
          const totalPage = await readLibrary(tabId, googleLibraryUrl(domain, country, undefined, true), readGoogleTotal).catch(() => null)
          allTime = totalPage?.state === 'ok' ? totalPage.label : null
          for (const platform of GOOGLE_PLATFORMS) {
            if (signal.aborted) break
            step(platform.label)
            const split = await readLibrary(tabId, googleLibraryUrl(domain, country, platform.id), readGoogleLibrary).catch(() => null)
            if (split && (split.state === 'ok' || split.state === 'none')) {
              const c = googleCount(split)
              if (c.count > 0) byPlatform.push({ label: platform.label, count: c.count, atLeast: c.atLeast })
            }
          }
        }
        results.push({ library: 'google', ...counted, advertisers: topAdvertisers(page.names), byPlatform, allTime, libraryUrl: googleUrl, error: null })
      }
    } catch (e) {
      results.push(failed('google', googleUrl, e instanceof Error ? e.message : 'Google could not be read.'))
    }

    // Meta Ad Library: active ads right now
    const metaUrl = metaLibraryUrl(domain, country)
    if (!signal.aborted) {
      step('Meta Ad Library')
      try {
        const page = await readLibrary(tabId, metaUrl, readMetaLibrary)
        if (page.state === 'blocked' || page.state === 'empty') results.push(failed('meta', metaUrl, blockedMessage(page, 'Meta')))
        else {
          const { count, approximate, own } = ownCount(page, isOwn)
          results.push({ library: 'meta', count, approximate, atLeast: false, advertisers: topAdvertisers(own), libraryUrl: metaUrl, error: null })
        }
      } catch (e) {
        results.push(failed('meta', metaUrl, e instanceof Error ? e.message : 'Meta could not be read.'))
      }
    }

    // LinkedIn Ad Library
    const linkedInUrl = linkedInLibraryUrl(businessName)
    if (!signal.aborted) {
      step('LinkedIn Ad Library')
      try {
        const page = await readLibrary(tabId, linkedInUrl, readLinkedInLibrary)
        if (page.state === 'blocked' || page.state === 'empty') results.push(failed('linkedin', linkedInUrl, blockedMessage(page, 'LinkedIn')))
        else {
          const { count, approximate, own } = ownCount(page, isOwn)
          results.push({ library: 'linkedin', count, approximate, atLeast: false, advertisers: topAdvertisers(own), libraryUrl: linkedInUrl, error: null })
        }
      } catch (e) {
        results.push(failed('linkedin', linkedInUrl, e instanceof Error ? e.message : 'LinkedIn could not be read.'))
      }
    }
  } finally {
    await chrome.tabs.remove(tabId).catch(() => undefined)
  }

  return { domain, checkedAt: new Date().toISOString(), country, results }
}
