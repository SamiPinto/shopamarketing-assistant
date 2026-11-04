import type { BusinessProfile, CategoryId, CategoryResult, ServiceFit, WebsiteProfile } from '../../types/analysis'
import { listJoin } from '../../utils/format'
import type { PageExtraction } from '../../types/page'
import { hasPhysicalFootprint } from './business'
import { findCheck, needsAttention } from './scoring'

type Categories = Record<CategoryId, CategoryResult>

function failing(category: CategoryResult): string[] {
  return category.checks.filter((c) => c.weight > 0 && needsAttention(c)).map((c) => c.detail)
}

/**
 * Service-fit rules. Each returns null when the signals do not support the
 * service — the engine never recommends every service by default.
 */
type Rule = (c: Categories, page: PageExtraction, business: BusinessProfile, profile: WebsiteProfile) => ServiceFit | null

const RULES: Rule[] = [
  (c) => {
    const score = c.seo.score ?? 100
    if (score >= 80) return null
    return {
      service: 'seo',
      label: 'SEO',
      strength: score < 60 ? 'strong-signal' : 'worth-exploring',
      reason: 'Technical and on-page signals show opportunities for further SEO investigation.',
      signals: failing(c.seo).slice(0, 4),
    }
  },
  (c) => {
    const schema = findCheck(c.seo.checks, 'seo-schema')
    if (!needsAttention(schema)) return null
    return {
      service: 'ai-seo',
      label: 'AI SEO',
      strength: 'worth-exploring',
      reason: 'No structured data was detected. Machine-readable business information supports visibility in AI answer engines and rich results.',
      signals: [schema?.detail ?? ''],
    }
  },
  (c, page) => {
    const hasPath = ['conv-cta', 'conv-phone', 'conv-form'].some((id) => findCheck(c.conversion.checks, id)?.status === 'good')
    if (page.tracking.googleAds) {
      return {
        service: 'google-ads',
        label: 'Google Ads',
        strength: 'worth-exploring',
        reason: 'A Google Ads tag was detected. An account review could be offered — campaign performance and spend are not visible from the website.',
        signals: ['Google Ads tag detected in page scripts'],
      }
    }
    if (!hasPath) return null
    return {
      service: 'google-ads',
      label: 'Google Ads',
      strength: 'worth-exploring',
      reason: 'Clear conversion paths exist that paid search could drive traffic to, and no Google Ads tag was detected on this page.',
      signals: ['Conversion path detected', 'No Google Ads tag detected'],
    }
  },
  (c) => {
    const detected = c.social.checks.filter((check) => check.status === 'good').length
    if (detected >= 3) return null
    return {
      service: 'social',
      label: 'Social Media',
      strength: detected === 0 ? 'strong-signal' : 'worth-exploring',
      reason: detected === 0
        ? 'No social profiles are linked from the website. Social presence should be researched before any recommendation.'
        : 'Only a small number of social platforms are linked from the website.',
      signals: [c.social.summary],
    }
  },
  (c, _page, _business, profile) => {
    if (profile.rebuildFit !== 'low') {
      return {
        service: 'website',
        label: 'Website',
        strength: profile.rebuildFit === 'strong' ? 'strong-signal' : 'worth-exploring',
        reason: `A website upgrade looks worth proposing — the site ${listJoin(profile.rebuildReasons)}.`,
        signals: profile.rebuildReasons,
      }
    }
    const web = c.website.score ?? 100
    const conv = c.conversion.score ?? 100
    if (web >= 75 && conv >= 60) return null
    const foundational = ['web-https', 'web-viewport'].some((id) => needsAttention(findCheck(c.website.checks, id)))
    return {
      service: 'website',
      label: 'Website',
      strength: foundational ? 'strong-signal' : 'worth-exploring',
      reason: 'Website structure and conversion signals suggest the site experience could be reviewed.',
      signals: [...failing(c.website), ...failing(c.conversion)].slice(0, 4),
    }
  },
  (_c, page) => {
    if (page.openGraph.image && page.images.total >= 4) return null
    return {
      service: 'creative',
      label: 'Creative',
      strength: 'worth-exploring',
      reason: 'Limited visual assets were detected (share image or on-page imagery), which may point to a creative opportunity.',
      signals: [
        page.openGraph.image ? 'Share image detected' : 'No Open Graph share image',
        `${page.images.total} images on the page`,
      ],
    }
  },
  (_c, _page, business) => {
    if (!business.location || !hasPhysicalFootprint(business)) return null
    return {
      service: 'ooh',
      label: 'OOH',
      strength: 'worth-exploring',
      reason: 'A business location and a physical-footprint industry were detected, so OOH planning may be worth evaluating once campaign objectives are known.',
      signals: [`Location: ${business.location.label}`, `Industry: ${business.industry?.label ?? 'unknown'}`],
    }
  },
]

export function recommendServices(
  categories: Categories,
  page: PageExtraction,
  business: BusinessProfile,
  profile: WebsiteProfile,
): ServiceFit[] {
  return RULES.map((rule) => rule(categories, page, business, profile)).filter((s): s is ServiceFit => s !== null)
}

export const SERVICE_DESCRIPTIONS: Record<ServiceFit['service'], string> = {
  seo: 'Technical, on-page and content SEO',
  'ai-seo': 'Visibility in AI answer engines and rich results',
  'google-ads': 'Paid search and Performance Max',
  social: 'Organic and paid social media',
  website: 'Website design, UX and conversion',
  creative: 'Brand, campaign and content creative',
  ooh: 'Out-of-home planning and buying',
}
