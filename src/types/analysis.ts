import type { PageExtraction, SocialPlatform, TechItem } from './page'

export type CategoryId =
  | 'website'
  | 'seo'
  | 'conversion'
  | 'social'
  | 'advertising'
  | 'local'
  | 'ooh'

/** Result of a single deterministic check. */
export type CheckStatus = 'good' | 'attention' | 'not-detected' | 'unknown'

export interface Check {
  id: string
  label: string
  status: CheckStatus
  /** What was (or was not) found, phrased factually. */
  detail: string
  /** "Why this matters" explanation for the team. */
  why: string
  /** Relative weight in the category score. 0 = informational only. */
  weight: number
}

/**
 * Category status deliberately avoids a single opaque "AI score". Categories
 * that cannot be judged from one page (advertising, OOH) use "limited" or
 * "research" instead of a number.
 */
export type CategoryStatus = 'good' | 'attention' | 'detected' | 'limited' | 'research'

export interface CategoryResult {
  id: CategoryId
  label: string
  status: CategoryStatus
  /** 0–100 rule-based signal strength, or null when not meaningful. */
  score: number | null
  summary: string
  checks: Check[]
}

/** How confident a statement is. Never upgrade "potential" to "detected". */
export type Certainty = 'detected' | 'potential' | 'research'

export type Priority = 'high' | 'medium' | 'low'

export interface Opportunity {
  id: string
  category: CategoryId
  title: string
  detail: string
  /** The extracted evidence that triggered this opportunity. */
  evidence: string
  certainty: Certainty
  priority: Priority
}

export type ServiceId = 'seo' | 'ai-seo' | 'google-ads' | 'social' | 'website' | 'creative' | 'ooh'

export interface ServiceFit {
  service: ServiceId
  label: string
  /** Always a *potential* fit — never a confirmed need. */
  strength: 'strong-signal' | 'worth-exploring'
  reason: string
  signals: string[]
}

export type IndustryId =
  | 'dental'
  | 'medical'
  | 'fitness'
  | 'retail'
  | 'hospitality'
  | 'legal'
  | 'real-estate'
  | 'trades'
  | 'automotive'
  | 'beauty'
  | 'education'
  | 'finance'
  | 'construction'

export interface BusinessProfile {
  name: string
  nameSource: 'schema' | 'open-graph' | 'title' | 'domain'
  domain: string
  url: string
  industry: { id: IndustryId; label: string; basis: string } | null
  location: { label: string; basis: string } | null
  socialPlatforms: SocialPlatform[]
}

export interface Insight {
  /** Which provider produced the text. "template" = deterministic, no model. */
  provider: 'template' | 'llm'
  headline: string
  summary: string[]
  whyItMatters: string[]
  investigate: string[]
  missingInformation: string[]
}

export type Rating3 = 'good' | 'fair' | 'poor' | 'unknown'

export type AiGap =
  | 'ai-blocked'
  | 'schema'
  | 'business-schema'
  | 'faq'
  | 'text'
  | 'js-only'
  | 'customer-info'
  | 'title-description'
  | 'h1'
  | 'sections'

/** Website-sales view of the page: stack, speed, mobile, design and freshness. */
export interface WebsiteProfile {
  platform: string | null
  techStack: TechItem[]
  outdatedTech: string[]
  speed: {
    rating: Rating3
    label: string
    loadMs: number | null
    lcpMs: number | null
    cls: number | null
    pageWeightKb: number | null
  }
  responsive: { rating: Rating3; label: string; reasons: string[] }
  /** How readable the page is for AI answer engines. Missing on analyses saved before this check existed. */
  /** `gaps` lists the failed checks in the same order as `missing`. */
  aiFriendly?: { rating: Rating3; label: string; present: string[]; missing: string[]; gaps?: AiGap[] }
  design: { rating: 'modern' | 'dated' | 'outdated'; score: number; modernSignals: string[]; datedSignals: string[] }
  lastUpdated: { year: number | null; label: string; basis: string; stale: boolean }
  /** How strong the case for a website rebuild/refresh is. */
  rebuildFit: 'strong' | 'moderate' | 'low'
  rebuildReasons: string[]
}

export interface MarketingAnalysis {
  id: string
  analysedAt: string
  source: 'live'
  scoringVersion: string
  business: BusinessProfile
  page: PageExtraction
  website: WebsiteProfile
  categories: Record<CategoryId, CategoryResult>
  opportunities: Opportunity[]
  services: ServiceFit[]
  insight: Insight
}

export const CATEGORY_ORDER: CategoryId[] = [
  'website',
  'seo',
  'conversion',
  'social',
  'advertising',
  'local',
  'ooh',
]
