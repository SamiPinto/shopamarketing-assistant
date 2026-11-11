import type { WebsiteFact } from '../services/websiteFacts'

/** Client-facing, 1–2 page "Website Opportunity Snapshot" used in sales conversations. */

export type GlanceStatus = 'strong' | 'improve' | 'missing' | 'unknown'

export interface GlanceItem {
  area: string
  status: GlanceStatus
  label: string
}

export interface ClientImprovement {
  id: string
  title: string
  /** What was observed on the page ("found"), or why it's suggested ("growth"). */
  found: string
  whyItMatters: string
  howShopaHelps: string
  service: string
  /** Plain-language line the salesperson can say to the prospect. */
  talkingPoint: string
  /** "found" = evidenced on the page; "growth" = an idea worth discussing. */
  kind: 'found' | 'growth'
}

export interface ComparisonRow {
  name: string
  domain: string
  isSubject: boolean
  platform: string
  speed: string
  mobile: string
  design: string
}

export interface ClientReport {
  business: string
  website: string
  date: string
  contactLine: string | null
  intro: string
  /** Two-line sales pitch: diagnosis, then the offer. */
  pitch: [string, string]
  websiteFacts: WebsiteFact[]
  comparison: ComparisonRow[]
  glance: GlanceItem[]
  strengths: string[]
  improvements: ClientImprovement[]
  disclaimer: string
}
