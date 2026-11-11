import type { CategoryId, Insight, MarketingAnalysis } from '../types/analysis'
import { listJoin, plural } from '../utils/format'
import { FEATURES } from '../config/features'
import { countSignals } from './analysis/opportunities'

/**
 * "Shopa Insight" provider. V1 uses deterministic templates — no AI model is
 * called and the UI says so. To add an LLM later, implement InsightProvider in
 * a backend endpoint (never ship API keys in the extension) and swap
 * `aiService.provider`.
 */
export interface InsightProvider {
  readonly id: Insight['provider']
  generate(analysis: Omit<MarketingAnalysis, 'insight'>): Promise<Insight>
}

const THEME: Partial<Record<CategoryId, string>> = {
  website: 'website foundations',
  seo: 'SEO metadata',
  conversion: 'conversion calls-to-action',
  social: 'social visibility',
  advertising: 'paid advertising',
  local: 'local search signals',
}

const WHY: Partial<Record<CategoryId, string>> = {
  website: 'Website foundations (security, mobile rendering, clear structure) affect every other channel — paid, organic and social traffic all land here.',
  seo: 'On-page SEO elements influence how the business appears in search results and whether people click through.',
  conversion: 'Conversion signals determine how much existing traffic turns into enquiries; improving them can lift results without extra media spend.',
  social: 'Social profiles provide ongoing proof and reach; linking them from the website connects the two audiences.',
  advertising: 'Advertising tags show whether paid activity can be measured; without them, campaign performance is hard to prove.',
  local: 'Local signals (address, phone, schema) underpin map-pack visibility for location-based searches.',
}

const INVESTIGATE: Record<string, string> = {
  seo: 'Run a full-site SEO crawl to confirm whether on-page issues repeat across service pages.',
  'ai-seo': 'Review structured data and FAQ content for AI answer-engine visibility.',
  'google-ads': 'Check search demand and competitor ad activity for the core services.',
  social: 'Audit the business’s social accounts directly (they may exist without being linked).',
  website: 'Review the mobile experience and primary conversion journey end-to-end.',
  creative: 'Review brand assets and imagery available for campaigns and share previews.',
  ooh: 'Discuss campaign objectives, locations and budget to scope an OOH brief.',
}

export const templateInsightProvider: InsightProvider = {
  id: 'template',
  async generate(analysis) {
    const signals = countSignals(analysis.opportunities)
    const byCategory = new Map<CategoryId, number>()
    for (const o of analysis.opportunities) {
      if (o.certainty === 'research') continue
      byCategory.set(o.category, (byCategory.get(o.category) ?? 0) + (o.priority === 'high' ? 2 : 1))
    }
    const strongest = [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id)

    const summary = [
      `The analysis of ${analysis.business.domain} identified ${plural(signals, 'opportunity signal')}.`,
    ]
    if (strongest.length) {
      summary.push(
        `The strongest signals are related to ${listJoin(strongest.map((id) => THEME[id] ?? id))}.`,
      )
    } else {
      summary.push('No significant gaps were detected in the signals visible on this page.')
    }
    if (FEATURES.ooh) summary.push('OOH suitability requires additional campaign and location information.')

    const missing = [
      !analysis.business.location && 'Business location (not detected on this page)',
      !analysis.business.industry && 'Industry (could not be inferred confidently)',
      'Google Business Profile and reviews',
      'Advertising activity and spend',
      'Website traffic and conversion data',
      FEATURES.ooh && 'Campaign objectives, audience and budget (for OOH)',
    ].filter((m): m is string => Boolean(m))

    return {
      provider: 'template',
      headline: signals
        ? `${plural(signals, 'opportunity signal')} detected`
        : 'No major opportunity signals detected',
      summary,
      whyItMatters: strongest.map((id) => WHY[id]).filter((w): w is string => Boolean(w)),
      investigate: analysis.services.map((s) => INVESTIGATE[s.service]).filter(Boolean),
      missingInformation: missing,
    }
  },
}

export const aiService = {
  provider: templateInsightProvider as InsightProvider,
  generateInsight(analysis: Omit<MarketingAnalysis, 'insight'>): Promise<Insight> {
    return this.provider.generate(analysis)
  },
}
