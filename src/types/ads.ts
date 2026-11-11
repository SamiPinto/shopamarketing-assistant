export type AdLibraryId = 'google' | 'meta' | 'linkedin'

/** Ads counted on one platform's public ad library. */
export interface AdLibraryResult {
  library: AdLibraryId
  /** Ads for this business; null when the library could not be read. */
  count: number | null
  /** True when the library only gives a rounded figure (e.g. "~300") or more ads exist than were loaded. */
  approximate: boolean
  /** True when the count is a floor: at least this many. */
  atLeast: boolean
  /** Advertiser accounts the counted ads were run by. */
  advertisers: string[]
  /** Google only: its rounded total of all ads ever shown, e.g. "~300". */
  allTime?: string | null
  /** Google only: ads per Google platform (Search, YouTube, …). */
  byPlatform?: { label: string; count: number; atLeast: boolean }[]
  /** The library page, to open and see the ads themselves. */
  libraryUrl: string
  error: string | null
}

export interface AdsReport {
  domain: string
  checkedAt: string
  /** Country the libraries were filtered to (MarketCode), or null for all countries. */
  country: string | null
  results: AdLibraryResult[]
}

export interface AdsProgress {
  done: number
  total: number
  step: string
}
