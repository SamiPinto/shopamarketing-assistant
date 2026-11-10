/**
 * Keyword ranking research: candidate keywords from the site itself and Google
 * Autocomplete, checked against live Google results in a background tab.
 * No search volumes; positions are organic results only (ads and map pack excluded).
 */

export type KeywordSource = 'site' | 'autocomplete' | 'manual'

export interface KeywordCandidate {
  keyword: string
  source: KeywordSource
  /** Where it came from, e.g. "Title" or "H2 heading". */
  basis: string
}

/** A suburb, city or postcode that searches are run for, e.g. "parramatta" or "2150". */
export interface SearchPlace {
  label: string
  kind: 'city' | 'postcode' | 'custom'
  basis: string
}

export interface SerpResult {
  /** 1-based organic position across the pages checked. */
  position: number
  /** Google result page it was found on (pages hold about 10 organic results). */
  page: number
  /** The result's link, or just its site address when Google hides the full URL. */
  url: string
  /** Google's address line, e.g. "https://site.com.au › services › drains". */
  display: string
  domain: string
  title: string
  /** Directories, social networks and marketplaces, not direct competitors. */
  directory: boolean
}

export interface KeywordRanking {
  /** The exact Google search, e.g. "blocked drains 2150". */
  keyword: string
  /** The service part, e.g. "blocked drains". Missing on older reports. */
  service?: string
  /** The place part, e.g. "2150"; null when searched without a place. Missing on older reports. */
  place?: string | null
  source: KeywordSource
  /** Google result pages actually read (10 organic results each). */
  pagesChecked: number
  /** The site's best position, or null when it isn't in the pages checked. */
  position: number | null
  rankingUrl: string | null
  /** Google's address line for the ranking page (its path as breadcrumbs). */
  rankingDisplay?: string | null
  results: SerpResult[]
  /** Set when this keyword couldn't be read (CAPTCHA, timeout, layout change). */
  error: string | null
}

export interface SearchCompetitor {
  domain: string
  /** How many checked keywords this domain appears for. */
  keywordCount: number
  bestPosition: number
  averagePosition: number
}

/** Where a competitor is, read from its own website (homepage, then contact page). */
export interface CompetitorLocation {
  domain: string
  checkedAt: string
  /** The page the address was found on. */
  url: string | null
  /** Address text as written on the site, shortened. */
  address: string | null
  /** Suburbs, cities and postcodes in that address. */
  places: string[]
  /** State or region, e.g. "NSW". */
  region: string | null
  /** Map position of that address (OpenStreetMap), for distance to the client. */
  point?: { lat: number; lon: number } | null
  error: string | null
}

/** Google Ads data for a keyword (DataForSEO). volume null = too few searches to measure. */
export interface KeywordVolume {
  /** Average monthly Google searches over the last 12 months, in the country. */
  volume: number | null
  /** What advertisers pay per click, in US dollars. */
  cpc: number | null
  competition: string | null
}

/** How close a competitor is to the client, best match first. */
export type LocalMatch = 'same-postcode' | 'same-suburb' | 'nearby' | 'same-region' | 'elsewhere' | 'unknown'

export interface KeywordReport {
  domain: string
  checkedAt: string
  /** Google host the searches ran on, e.g. "www.google.co.uk". */
  market: string
  /** Country searched (MarketCode), or "WW" for worldwide google.com. Missing on older reports (Australia). */
  marketCode?: string
  /** Places searched, in column order. Missing on older reports. */
  places?: string[]
  keywords: KeywordRanking[]
  /** Where the results came from: the free Google tab, or DataForSEO. Missing on older reports (Google). */
  provider?: 'google' | 'dataforseo'
  /** DataForSEO search volumes, keyed by lower-case keyword (searches and services). */
  volumes?: Record<string, KeywordVolume>
  /** What the DataForSEO run cost, in US dollars. */
  cost?: number
  /** Set when Google stopped the run part-way (CAPTCHA or consent page). */
  stoppedReason: string | null
}

export interface KeywordProgress {
  done: number
  total: number
  keyword: string
  page: number
  /** Google is showing a CAPTCHA that the person needs to complete. */
  captcha?: boolean
}

/** A keyword the site already ranks for, from DataForSEO's Google database (country-wide). */
export interface RankedKeyword {
  keyword: string
  position: number
  /** The site's page that ranks. */
  url: string
  volume: number | null
  cpc: number | null
  /** Estimated monthly visits this ranking brings. */
  traffic: number | null
}

export interface RankedKeywordsReport {
  domain: string
  checkedAt: string
  marketCode: string
  /** How many keywords the site ranks for in total (top 100). */
  total: number
  keywords: RankedKeyword[]
  /** What the lookup cost, in US dollars. */
  cost: number
}
