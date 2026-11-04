import {
  Megaphone,
  MapPin,
  Monitor,
  MousePointerClick,
  Search,
  Share2,
  Signpost,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryId, MarketingAnalysis } from '../../types/analysis'

export const CATEGORY_ICONS: Record<CategoryId, LucideIcon> = {
  website: Monitor,
  seo: Search,
  conversion: MousePointerClick,
  social: Share2,
  advertising: Megaphone,
  local: MapPin,
  ooh: Signpost,
}

/** Opportunity signals (excluding research-only items) for a category. */
export function signalCount(analysis: MarketingAnalysis, id: CategoryId): number {
  return analysis.opportunities.filter((o) => o.category === id && o.certainty !== 'research').length
}

export function goodChecks(analysis: MarketingAnalysis, id: CategoryId): { good: number; total: number } {
  const scored = analysis.categories[id].checks.filter((c) => c.weight > 0 && c.status !== 'unknown')
  return { good: scored.filter((c) => c.status === 'good').length, total: scored.length }
}
