import { DEMO_COMPETITOR_TEMPLATES } from '../data/demoCompetitors'
import type { MarketingAnalysis } from '../types/analysis'
import type { CompetitorResult } from '../types/misc'

/**
 * Competitor research. V1 returns clearly-labelled demo data. A future provider
 * (SEO platform, ad library, OOH monitoring) implements the same interface.
 */
export interface CompetitorProvider {
  getCompetitors(analysis: MarketingAnalysis): Promise<CompetitorResult>
}

export const demoCompetitorProvider: CompetitorProvider = {
  async getCompetitors(analysis) {
    const industry = analysis.business.industry?.label ?? 'Same category'
    const letters = ['A', 'B', 'C']
    return {
      source: 'demo',
      disclaimer:
        'Demo competitor data. These are fictional placeholder profiles that illustrate the research layout — they are not real businesses and contain no measured data.',
      competitors: DEMO_COMPETITOR_TEMPLATES.map((template, i) => ({
        ...template,
        id: `demo-competitor-${letters[i]}`,
        name: `${industry} Competitor ${letters[i]} (demo)`,
        website: `competitor-${letters[i].toLowerCase()}.example`,
      })),
    }
  },
}

export const competitorService = {
  provider: demoCompetitorProvider as CompetitorProvider,
  getCompetitors(analysis: MarketingAnalysis): Promise<CompetitorResult> {
    return this.provider.getCompetitors(analysis)
  },
}
