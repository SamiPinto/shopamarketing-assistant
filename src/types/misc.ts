import type { ServiceId } from './analysis'
import type { PageExtraction } from './page'

/* ---------- Competitors ---------- */

export type PresenceLevel = 'strong' | 'moderate' | 'limited' | 'unknown'

export interface Competitor {
  id: string
  name: string
  website: string
  digitalPresence: PresenceLevel
  socialPresence: PresenceLevel
  oohActivity: 'observed' | 'not-observed' | 'unknown'
  notes: string
  potentialGap: string
}

export interface CompetitorResult {
  /** "demo" data must always be labelled as such in the UI. */
  source: 'demo' | 'provider'
  competitors: Competitor[]
  disclaimer: string
}

/* ---------- Strategy ---------- */

export interface StrategyPhase {
  window: string
  focus: string
  actions: string[]
}

export interface MarketingStrategy {
  currentSituation: string[]
  opportunities: { title: string; detail: string; category: string }[]
  investigations: string[]
  channels: { service: ServiceId; label: string; rationale: string }[]
  plan: StrategyPhase[]
  caveats: string[]
}

/* ---------- Report ---------- */

export interface ReportSection {
  id: string
  title: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface OpportunityReport {
  title: string
  business: string
  website: string
  analysisDate: string
  preparedBy: string | null
  isDemo: boolean
  sections: ReportSection[]
}

/* ---------- Settings ---------- */

export interface Settings {
  demoMode: boolean
  /** Shown on generated reports. Stored locally only. */
  preparedBy: string
  /** Contact details printed on the client report, e.g. email · phone. */
  contactLine: string
  /** Look up domain, hosting and archive data from free public services. */
  onlineLookups: boolean
  /** Optional free Google PageSpeed Insights API key (entered by the user, stored locally). */
  pageSpeedApiKey: string
}

export const DEFAULT_SETTINGS: Settings = {
  demoMode: false,
  preparedBy: '',
  contactLine: '',
  onlineLookups: true,
  pageSpeedApiKey: '',
}

/* ---------- Extension messaging ---------- */

export const EXTRACT_MESSAGE = 'shopa:extract-page'

export interface ContentRequest {
  type: typeof EXTRACT_MESSAGE
}

export type ContentResponse = { ok: true; data: PageExtraction } | { ok: false; error: string }

export interface OpenDashboardRequest {
  type: 'shopa:open-dashboard'
  section?: string
}
