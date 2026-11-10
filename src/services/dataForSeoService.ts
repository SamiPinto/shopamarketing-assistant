import { isDirectoryDomain, matchesDomain, rootDomain } from '../data/directories'
import type {
  KeywordProgress,
  KeywordRanking,
  KeywordVolume,
  RankedKeyword,
  RankedKeywordsReport,
  SerpResult,
} from '../types/keywords'

/**
 * DataForSEO (paid, pay-as-you-go): Google results read on DataForSEO's
 * servers for an exact map position, so no Google tab, no CAPTCHA and true
 * suburb/pincode results, plus Google Ads monthly search volumes.
 *
 * The API login and password come from .env (VITE_DATAFORSEO_LOGIN /
 * VITE_DATAFORSEO_PASSWORD) and are built into the extension, so only share
 * the built extension inside the team.
 */

const API = 'https://api.dataforseo.com/v3'
const LOGIN = import.meta.env.VITE_DATAFORSEO_LOGIN?.trim() ?? ''
const PASSWORD = import.meta.env.VITE_DATAFORSEO_PASSWORD?.trim() ?? ''
/** Searches sent to DataForSEO at the same time. */
const CONCURRENCY = 3
/** Accuracy of the searcher's position for a place, in DataForSEO's units (mm, 199–199999). */
const COORDINATE_RADIUS = 10000

/** Google geo target ids for each country (Google Ads location codes). */
const LOCATION_CODES: Record<string, number> = {
  AU: 2036,
  NZ: 2554,
  GB: 2826,
  IE: 2372,
  US: 2840,
  CA: 2124,
  IN: 2356,
  SG: 2702,
  ZA: 2710,
  AE: 2784,
  // Worldwide has no single location; US Google is the closest to google.com.
  WW: 2840,
}

export const DATAFORSEO_ENABLED = Boolean(LOGIN && PASSWORD)

export class DataForSeoError extends Error {}

interface ApiTask<T> {
  status_code: number
  status_message: string
  cost: number
  result: T[] | null
}

interface ApiResponse<T> {
  status_code: number
  status_message: string
  cost: number
  tasks?: ApiTask<T>[]
}

async function call<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<{ result: T[]; cost: number }> {
  if (!DATAFORSEO_ENABLED) throw new DataForSeoError('DataForSEO is not set up. Add the API login and password to .env and rebuild.')
  let response: Response
  try {
    response = await fetch(`${API}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { Authorization: `Basic ${btoa(`${LOGIN}:${PASSWORD}`)}`, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'omit',
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new DataForSeoError('DataForSEO could not be reached. Check the internet connection.')
  }
  if (response.status === 401) throw new DataForSeoError('DataForSEO rejected the API login or password in .env.')
  if (response.status === 402) throw new DataForSeoError('The DataForSEO balance has run out. Top it up at app.dataforseo.com.')
  const data = (await response.json().catch(() => null)) as ApiResponse<T> | null
  if (!data) throw new DataForSeoError(`DataForSEO returned an unreadable reply (HTTP ${response.status}).`)
  // 402xx: payment required (balance used up).
  if (Math.floor(data.status_code / 100) === 402) throw new DataForSeoError('The DataForSEO balance has run out. Top it up at app.dataforseo.com.')
  if (data.status_code !== 20000) throw new DataForSeoError(`DataForSEO: ${data.status_message}`)
  const task = data.tasks?.[0]
  if (!task || task.status_code !== 20000) throw new DataForSeoError(`DataForSEO: ${task?.status_message ?? 'no result'}`)
  return { result: task.result ?? [], cost: task.cost ?? data.cost ?? 0 }
}

/** Money left on the DataForSEO account, in US dollars. */
export async function dataForSeoBalance(): Promise<number | null> {
  const { result } = await call<{ money?: { balance?: number } }>('/appendix/user_data')
  return result[0]?.money?.balance ?? null
}

interface OrganicItem {
  type: string
  rank_group?: number
  domain?: string
  url?: string
  title?: string
  breadcrumb?: string
}

export interface DataForSeoSearch extends Pick<KeywordRanking, 'keyword' | 'service' | 'place' | 'source'> {
  /** Where the searcher is: the place's map position, when it could be found. */
  point?: { lat: number; lon: number } | null
}

export interface DataForSeoRankOptions {
  domain: string
  marketCode: string
  searches: DataForSeoSearch[]
  /** Google result pages to read (10 results each, 1–3). */
  maxPages: number
  signal: AbortSignal
  onProgress(progress: KeywordProgress): void
  onKeyword(ranking: KeywordRanking): void
}

async function searchOne(search: DataForSeoSearch, options: DataForSeoRankOptions): Promise<{ ranking: KeywordRanking; cost: number }> {
  const { domain, marketCode, maxPages, signal } = options
  const where = search.point
    ? { location_coordinate: `${search.point.lat.toFixed(7)},${search.point.lon.toFixed(7)},${COORDINATE_RADIUS}` }
    : { location_code: LOCATION_CODES[marketCode] ?? LOCATION_CODES.WW }
  const base = { keyword: search.keyword, service: search.service, place: search.place, source: search.source }
  try {
    const { result, cost } = await call<{ items?: OrganicItem[] | null }>(
      '/serp/google/organic/live/advanced',
      [{ keyword: search.keyword, language_code: 'en', device: 'desktop', depth: maxPages * 10, ...where }],
      signal,
    )
    const results: SerpResult[] = []
    for (const item of result[0]?.items ?? []) {
      if (item.type !== 'organic' || !item.url) continue
      const position = results.length + 1
      const resultDomain = rootDomain(item.url)
      results.push({
        position,
        page: Math.ceil(position / 10),
        url: item.url,
        display: item.breadcrumb ?? item.url,
        domain: resultDomain,
        title: item.title ?? '',
        directory: isDirectoryDomain(resultDomain),
      })
    }
    const own = results.find((r) => matchesDomain(r.domain, domain)) ?? null
    return {
      cost,
      ranking: {
        ...base,
        pagesChecked: maxPages,
        position: own?.position ?? null,
        rankingUrl: own?.url ?? null,
        rankingDisplay: own?.display ?? null,
        results,
        error: results.length ? null : 'Google returned no organic results for this search.',
      },
    }
  } catch (e) {
    if (signal.aborted || (e instanceof DataForSeoError && /login|balance/.test(e.message))) throw e
    const error = e instanceof Error ? e.message : 'DataForSEO could not read this search.'
    return { cost: 0, ranking: { ...base, pagesChecked: 0, position: null, rankingUrl: null, results: [], error } }
  }
}

/**
 * Runs every search through DataForSEO, a few at a time. Returns the total
 * cost in US dollars. A wrong login or empty balance stops the whole run.
 */
export async function checkRankingsWithDataForSeo(options: DataForSeoRankOptions): Promise<number> {
  const { searches, signal, onProgress, onKeyword } = options
  let next = 0
  let done = 0
  let cost = 0
  const worker = async () => {
    while (next < searches.length && !signal.aborted) {
      const search = searches[next++]!
      onProgress({ done, total: searches.length, keyword: search.keyword, page: 1 })
      const outcome = await searchOne(search, options)
      cost += outcome.cost
      done++
      onKeyword(outcome.ranking)
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, searches.length) }, worker))
  return cost
}

/** Keywords looked up per site: the most-searched ones it ranks for. */
export const RANKED_KEYWORD_LIMIT = 100
/** Positions beyond this are too far down to be worth listing. */
const RANKED_MAX_POSITION = 50
// DataForSEO Labs list prices (USD): per request plus per keyword returned.
export const RANKED_REQUEST_COST = 0.01
export const RANKED_ITEM_COST = 0.0001

interface RankedItem {
  keyword_data?: { keyword?: string; keyword_info?: { search_volume?: number | null; cpc?: number | null } }
  ranked_serp_element?: { serp_item?: { rank_group?: number; url?: string; etv?: number | null } }
}

/**
 * Keywords the site already ranks for on Google in the country (organic
 * results in the top 50), most-searched first. From DataForSEO's own
 * database of Google results, refreshed monthly, so country-wide rather than
 * per suburb.
 */
export async function rankedKeywords(domain: string, marketCode: string): Promise<Omit<RankedKeywordsReport, 'checkedAt'>> {
  const target = domain.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '')
  const { result, cost } = await call<{ total_count?: number; items?: RankedItem[] | null }>(
    '/dataforseo_labs/google/ranked_keywords/live',
    [
      {
        target,
        location_code: LOCATION_CODES[marketCode] ?? LOCATION_CODES.WW,
        language_code: 'en',
        item_types: ['organic'],
        filters: ['ranked_serp_element.serp_item.rank_group', '<=', RANKED_MAX_POSITION],
        order_by: ['keyword_data.keyword_info.search_volume,desc'],
        limit: RANKED_KEYWORD_LIMIT,
      },
    ],
  )
  const keywords: RankedKeyword[] = []
  for (const item of result[0]?.items ?? []) {
    const keyword = item.keyword_data?.keyword
    const serp = item.ranked_serp_element?.serp_item
    if (!keyword || !serp?.rank_group) continue
    keywords.push({
      keyword,
      position: serp.rank_group,
      url: serp.url ?? '',
      volume: item.keyword_data?.keyword_info?.search_volume ?? null,
      cpc: item.keyword_data?.keyword_info?.cpc ?? null,
      traffic: serp.etv ?? null,
    })
  }
  return { domain, marketCode, total: result[0]?.total_count ?? keywords.length, keywords, cost }
}

interface VolumeItem {
  keyword: string
  search_volume: number | null
  cpc: number | null
  competition: string | null
}

// Google Ads only accepts plain words: no symbols, up to 80 characters and 10 words.
const usableForAds = (keyword: string) =>
  keyword.length <= 80 && keyword.split(/\s+/).length <= 10 && /^[\p{L}\p{N}\s'&-]+$/u.test(keyword)

/**
 * Average monthly Google searches (last 12 months) for each keyword in the
 * country, with the advertisers' cost per click. One request covers them all.
 */
export async function searchVolumes(
  keywords: string[],
  marketCode: string,
): Promise<{ volumes: Record<string, KeywordVolume>; cost: number }> {
  const wanted = [...new Set(keywords.map((k) => k.toLowerCase().trim()))].filter(usableForAds)
  if (wanted.length === 0) return { volumes: {}, cost: 0 }
  const { result, cost } = await call<VolumeItem>('/keywords_data/google_ads/search_volume/live', [
    { keywords: wanted, location_code: LOCATION_CODES[marketCode] ?? LOCATION_CODES.WW, language_code: 'en' },
  ])
  const volumes: Record<string, KeywordVolume> = {}
  for (const item of result) {
    volumes[item.keyword.toLowerCase()] = {
      volume: item.search_volume ?? null,
      cpc: item.cpc ?? null,
      competition: item.competition ?? null,
    }
  }
  // Keywords Google Ads had no data for are too rare to measure.
  for (const keyword of wanted) volumes[keyword] ??= { volume: null, cpc: null, competition: null }
  return { volumes, cost }
}
