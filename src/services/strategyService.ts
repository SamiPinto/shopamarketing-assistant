import type { MarketingAnalysis, ServiceId } from '../types/analysis'
import type { MarketingStrategy, StrategyPhase } from '../types/misc'
import { listJoin } from '../utils/format'
import { countSignals } from './analysis/opportunities'

const CHANNEL_RATIONALE: Record<ServiceId, string> = {
  seo: 'Could be considered to address on-page gaps and build organic visibility for core services.',
  'ai-seo': 'Could be considered to make business information machine-readable for AI answer engines.',
  'google-ads': 'Could be considered to capture existing search demand, once conversion tracking is confirmed.',
  social: 'Could be considered to build ongoing visibility and proof, subject to an audit of existing accounts.',
  website: 'Could be considered to strengthen foundations and the conversion journey before scaling traffic.',
  creative: 'Could be considered to supply campaign-ready assets and stronger share imagery.',
  ooh: 'Could be considered for location-based awareness once objectives, audience and budget are defined.',
}

const PHASE_ACTIONS: Record<ServiceId, [string, string, string]> = {
  seo: ['Full SEO crawl and keyword research', 'Prioritise on-page fixes for key service pages', 'Track rankings and organic enquiries'],
  'ai-seo': ['Audit structured data and FAQ content', 'Implement LocalBusiness / service schema', 'Monitor AI answer-engine mentions'],
  'google-ads': ['Search demand and competitor ad review', 'Pilot campaign on highest-intent services', 'Optimise bids, ads and landing pages'],
  social: ['Audit existing accounts and content', 'Define content pillars and cadence', 'Review engagement and referral traffic'],
  website: ['Mobile UX and conversion journey review', 'Implement priority CTA and form improvements', 'Measure conversion-rate change'],
  creative: ['Brand asset and imagery review', 'Produce core campaign asset set', 'Iterate creative based on performance'],
  ooh: ['Scope objectives, locations and budget', 'Build OOH brief and request media options', 'Evaluate reach, frequency and location exposure'],
}

function buildPlan(services: ServiceId[]): StrategyPhase[] {
  const pick = (index: 0 | 1 | 2) => services.map((s) => PHASE_ACTIONS[s][index])
  return [
    {
      window: 'Days 1–30',
      focus: 'Discover & validate',
      actions: ['Confirm business goals, priority services and target locations with the client', 'Gather access to analytics, search console and ad accounts', ...pick(0)],
    },
    {
      window: 'Days 31–60',
      focus: 'Plan & pilot',
      actions: ['Agree priorities based on validated findings', ...pick(1)],
    },
    {
      window: 'Days 61–90',
      focus: 'Measure & refine',
      actions: [...pick(2), 'Report results and agree the next quarter’s plan'],
    },
  ]
}

export const strategyService = {
  build(analysis: MarketingAnalysis): MarketingStrategy {
    const { business, categories, opportunities, services } = analysis
    const signalCount = countSignals(opportunities)
    const good = Object.values(categories).filter((c) => c.status === 'good').map((c) => c.label)

    const currentSituation = [
      `${business.name} (${business.domain})${business.industry ? ` appears to operate in ${business.industry.label.toLowerCase()}` : ''}${business.location ? `, with a detected location of ${business.location.label}` : ''}.`,
      good.length
        ? `Signals look healthy for ${listJoin(good)}.`
        : 'No category showed consistently strong signals on this page.',
      `${signalCount} opportunity signals were identified from the analysed page.`,
    ]

    return {
      currentSituation,
      opportunities: opportunities
        .filter((o) => o.certainty !== 'research')
        .slice(0, 6)
        .map((o) => ({ title: o.title, detail: o.detail, category: categories[o.category].label })),
      investigations: [
        ...opportunities.filter((o) => o.certainty === 'research').map((o) => o.title),
        'Validate findings across the wider site, not just the analysed page',
        'Review analytics and conversion data with the client',
      ],
      channels: services.map((s) => ({ service: s.service, label: s.label, rationale: CHANNEL_RATIONALE[s.service] })),
      plan: buildPlan(services.map((s) => s.service)),
      caveats: [
        'This strategy is generated from signals on a single page and is a starting point for discussion, not a confirmed plan.',
        'No service is confirmed as required until validated with client data and objectives.',
      ],
    }
  },
}
