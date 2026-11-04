import type { CategoryId, CategoryResult, MarketingAnalysis } from '../types/analysis'
import type { PageExtraction } from '../types/page'
import { createId } from '../utils/format'
import { aiService } from './aiService'
import { detectBusiness } from './analysis/business'
import {
  analyseAdvertising,
  analyseConversion,
  analyseLocal,
  analyseSocial,
  analyseWebsite,
} from './analysis/categories'
import { buildOpportunities } from './analysis/opportunities'
import { buildWebsiteProfile } from './analysis/websiteProfile'
import { recommendServices } from './analysis/serviceFit'
import { FEATURES } from '../config/features'
import { oohService } from './oohService'
import { seoService } from './seoService'
import { SCORING_VERSION } from './analysis/version'

export { SCORING_VERSION }

/**
 * Analysis pipeline: PageExtraction → MarketingAnalysis. Entirely local and
 * deterministic. A backend implementation can replace `analysisService.analyse`
 * while keeping the same input/output contract.
 */
export interface AnalysisProvider {
  analyse(page: PageExtraction): Promise<MarketingAnalysis>
}

export const localAnalysisProvider: AnalysisProvider = {
  async analyse(page) {
    const business = detectBusiness(page)
    const website = buildWebsiteProfile(page)
    const categories: Record<CategoryId, CategoryResult> = {
      website: analyseWebsite(page, website),
      seo: seoService.analyse(page),
      conversion: analyseConversion(page),
      social: analyseSocial(page),
      advertising: analyseAdvertising(page),
      local: analyseLocal(page, business),
      ooh: oohService.analyse(business),
    }
    const opportunities = buildOpportunities(categories)
    const services = recommendServices(categories, page, business, website).filter((s) => s.service !== 'ooh' || FEATURES.ooh)

    const base = {
      id: createId('analysis'),
      analysedAt: new Date().toISOString(),
      source: page.source,
      scoringVersion: SCORING_VERSION,
      business,
      page,
      website,
      categories,
      opportunities,
      services,
    }
    return { ...base, insight: await aiService.generateInsight(base) }
  },
}

export const analysisService = {
  provider: localAnalysisProvider as AnalysisProvider,
  analyse(page: PageExtraction): Promise<MarketingAnalysis> {
    return this.provider.analyse(page)
  },
}
