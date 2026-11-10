/**
 * Raw, publicly visible information extracted from a web page by the content
 * script. This is the single input contract for
 * the analysis engine — a future backend crawler should produce the same shape.
 */

export type SocialPlatform = 'instagram' | 'facebook' | 'linkedin' | 'tiktok' | 'youtube' | 'x'

export type CtaIntent =
  | 'book'
  | 'contact'
  | 'quote'
  | 'start'
  | 'enquire'
  | 'call'
  | 'shop'
  | 'learn'
  | 'apply'
  | 'subscribe'

export interface CtaSignal {
  text: string
  intent: CtaIntent
  element: 'button' | 'link' | 'input'
  /** Visible within the first viewport height when the page was scanned. */
  aboveFold: boolean
}

export interface SocialLink {
  platform: SocialPlatform
  url: string
}

export interface FormSummary {
  count: number
  /** Total visible input/select/textarea fields across all forms. */
  fieldCount: number
  hasEmailField: boolean
  hasPhoneField: boolean
  /** Every detected form looks like a site search box. */
  searchOnly: boolean
}

export interface SchemaSummary {
  /** @type values found in JSON-LD blocks, e.g. "Dentist", "LocalBusiness". */
  types: string[]
  blockCount: number
  name: string | null
  telephone: string | null
  locality: string | null
  region: string | null
  postcode: string | null
  streetAddress: string | null
  /** addressCountry, e.g. "AU" or "United Kingdom". Missing on older analyses. */
  country?: string | null
}

export interface OpenGraphSummary {
  title: string | null
  description: string | null
  image: string | null
  siteName: string | null
}

/** Third-party tags visible in the page's script sources or inline scripts. */
export interface TrackingSignals {
  googleTagManager: boolean
  googleAnalytics: boolean
  googleAds: boolean
  metaPixel: boolean
  linkedInInsight: boolean
  tiktokPixel: boolean
}

export type TechCategory =
  | 'cms'
  | 'builder'
  | 'ecommerce'
  | 'framework'
  | 'library'
  | 'css'
  | 'fonts'
  | 'marketing'
  | 'booking'
  | 'chat'
  | 'payments'
  | 'cdn'
  | 'legacy'

export interface TechItem {
  name: string
  category: TechCategory
  version: string | null
  /** True when the detected version is known to be out of date. */
  outdated: boolean
}

/** Real measurements from the user's own browser load of the page. */
export interface PerformanceSignals {
  measured: boolean
  ttfbMs: number | null
  domContentLoadedMs: number | null
  loadMs: number | null
  /** Largest Contentful Paint (Core Web Vital). */
  lcpMs: number | null
  /** Cumulative Layout Shift (Core Web Vital). */
  cls: number | null
  /** Lower bound: cross-origin resources may not report their size. */
  pageWeightKb: number | null
  requestCount: number
  scriptCount: number
}

export interface DesignSignals {
  modernImages: number
  lazyImages: number
  svgCount: number
  webFonts: string[]
  usesFlexOrGrid: boolean
  /** <font>, <center>, <marquee>, <frame> and similar. */
  legacyTags: number
  layoutTables: number
  flash: boolean
  horizontalOverflow: boolean
  /** Readable responsive media queries; null when stylesheets are cross-origin. */
  mediaQueries: number | null
  baseFontPx: number | null
  viewportWidth: number
}

export interface FreshnessSignals {
  /** Latest year found in a copyright notice, e.g. "© 2019". */
  copyrightYear: number | null
  /** article:modified_time / og:updated_time / JSON-LD dateModified. */
  modifiedMeta: string | null
  /** Last-Modified reported by the server, when it isn't simply "now". */
  serverLastModified: string | null
}

export interface AiSignals {
  /** robots.txt rules for AI crawlers. 'none' means the site has no file, so nothing is blocked. */
  robots: { status: 'found' | 'none' | 'unavailable'; blockedCrawlers: string[] }
  /** Words in the page's HTML before JavaScript runs; null if it couldn't be fetched again. */
  rawWordCount: number | null
  openingHours: boolean
  serviceArea: boolean
  reviews: boolean
}

export interface PageExtraction {
  url: string
  domain: string
  protocol: string
  title: string
  lang: string | null
  metaDescription: string | null
  canonical: string | null
  viewport: string | null
  headings: { h1: string[]; h2: string[]; h3: string[] }
  images: { total: number; missingAlt: number }
  links: { total: number; internal: number; external: number }
  forms: FormSummary
  buttonCount: number
  ctas: CtaSignal[]
  phones: string[]
  emails: string[]
  socialLinks: SocialLink[]
  /** Address-like text fragments found in footers, contact blocks or schema. */
  addressCandidates: string[]
  /** Start of the footer's visible text, where addresses usually are. Missing on older analyses. */
  footerText?: string
  schema: SchemaSummary
  openGraph: OpenGraphSummary
  tracking: TrackingSignals
  tech: TechItem[]
  performance: PerformanceSignals
  design: DesignSignals
  freshness: FreshnessSignals
  wordCount: number
  /** Distinct question-style texts (FAQ items, accordions, headings). Missing on older analyses. */
  questionCount?: number
  /** Signals for the AI-friendly check. Missing on older analyses. */
  aiSignals?: AiSignals
  /** True when extraction hit the configured element limits. */
  truncated: boolean
  extractedAt: string
  source: 'live'
}
