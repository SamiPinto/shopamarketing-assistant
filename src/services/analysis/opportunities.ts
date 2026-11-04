import { FEATURES } from '../../config/features'
import type {
  CategoryId,
  CategoryResult,
  Certainty,
  Check,
  Opportunity,
  Priority,
} from '../../types/analysis'

interface OpportunityRule {
  title: string
  detail: string
  priority: Priority
  certainty: Certainty
}

/**
 * Maps a failing check to an opportunity statement. Statements describe what
 * was observed on the page and stay at "potential" for anything interpretive.
 * Checks without a rule do not create opportunities.
 */
const RULES: Record<string, OpportunityRule> = {
  'web-https': { title: 'Page is not served over HTTPS', detail: 'Securing the site removes browser "Not secure" warnings that can deter enquiries.', priority: 'high', certainty: 'detected' },
  'web-viewport': { title: 'Mobile viewport not configured', detail: 'The page may not render responsively on phones. A mobile experience review is worth investigating.', priority: 'high', certainty: 'detected' },
  'web-speed': { title: 'Slow page load', detail: 'The page was slow to load in testing. A faster, optimised website could keep more visitors and support search rankings.', priority: 'high', certainty: 'detected' },
  'web-responsive': { title: 'Not fully mobile-friendly', detail: 'The site does not fully adapt to small screens. A responsive rebuild or refresh could improve the mobile experience.', priority: 'high', certainty: 'detected' },
  'web-design': { title: 'Website design looks dated', detail: 'Several indicators suggest an older build. A modern redesign could lift trust and conversion — confirm with a visual review.', priority: 'high', certainty: 'potential' },
  'web-tech': { title: 'Outdated website technology', detail: 'The site runs out-of-date software or libraries, which can limit speed, security and design updates.', priority: 'medium', certainty: 'detected' },
  'web-updated': { title: 'No sign of recent updates', detail: 'The newest date found on the page is a few years old. A refresh could signal an active, current business.', priority: 'medium', certainty: 'potential' },
  'web-content': { title: 'Limited on-page content', detail: 'The page has relatively little visible text. Richer service content could help both visitors and search visibility.', priority: 'low', certainty: 'potential' },
  'seo-title': { title: 'Title tag could be improved', detail: 'The page title is missing or outside the typical length range. Optimising it is a quick on-page win to investigate.', priority: 'medium', certainty: 'detected' },
  'seo-meta': { title: 'Meta description missing or unoptimised', detail: 'Search engines may show arbitrary page text as the result snippet. A written description could lift click-through.', priority: 'medium', certainty: 'detected' },
  'seo-h1': { title: 'H1 heading structure', detail: 'The page lacks a single clear H1. Clarifying the main heading strengthens topical relevance.', priority: 'medium', certainty: 'detected' },
  'seo-canonical': { title: 'No canonical tag', detail: 'Without a canonical URL, duplicate versions of the page can split search signals.', priority: 'low', certainty: 'detected' },
  'seo-og': { title: 'Social share previews incomplete', detail: 'Open Graph tags are missing or partial, so shared links may display poorly on social and messaging apps.', priority: 'low', certainty: 'detected' },
  'seo-alt': { title: 'Images missing alt text', detail: 'Missing alt text is an accessibility gap and a missed image-search opportunity.', priority: 'medium', certainty: 'detected' },
  'seo-schema': { title: 'No structured data detected', detail: 'Schema.org markup could help search engines and AI answer engines understand the business. Potential AI SEO opportunity.', priority: 'medium', certainty: 'detected' },
  'seo-internal': { title: 'Few internal links', detail: 'Limited internal linking may restrict discovery of service pages.', priority: 'low', certainty: 'potential' },
  'conv-cta': { title: 'No clear primary call-to-action', detail: 'Visitors are not given a clear next step such as booking, calling or enquiring.', priority: 'high', certainty: 'detected' },
  'conv-fold': { title: 'Primary CTA not visible in the first screen', detail: 'A call-to-action exists, but not above the fold. Surfacing it earlier could capture more intent.', priority: 'medium', certainty: 'detected' },
  'conv-form': { title: 'No enquiry form detected', detail: 'A lead form could capture enquiries outside business hours and create a measurable conversion event.', priority: 'medium', certainty: 'potential' },
  'conv-phone': { title: 'No phone number detected', detail: 'For service businesses a visible, click-to-call number is often the highest-value conversion path.', priority: 'medium', certainty: 'potential' },
  'local-location': { title: 'Business location not stated', detail: 'No location was detected. Clear service-area information supports local search and local advertising.', priority: 'medium', certainty: 'potential' },
  'local-schema': { title: 'No local business schema', detail: 'LocalBusiness markup could reinforce address, hours and contact details for local search.', priority: 'low', certainty: 'detected' },
}

function opportunityFromCheck(category: CategoryId, check: Check): Opportunity | null {
  const rule = RULES[check.id]
  if (!rule || (check.status !== 'attention' && check.status !== 'not-detected')) return null
  return { id: `opp-${check.id}`, category, evidence: check.detail, ...rule }
}

function socialOpportunity(social: CategoryResult): Opportunity | null {
  const detected = social.checks.filter((c) => c.status === 'good')
  if (detected.length >= 3) return null
  return {
    id: 'opp-social-visibility',
    category: 'social',
    title: detected.length ? 'Limited social links on the website' : 'No social links detected',
    detail: detected.length
      ? 'Only a small number of social platforms are linked. Social visibility and content consistency may be worth reviewing.'
      : 'The page does not link to social profiles. Accounts may exist — social presence requires further research.',
    evidence: social.summary,
    certainty: 'potential',
    priority: detected.length ? 'low' : 'medium',
  }
}

function advertisingOpportunity(ads: CategoryResult, conversion: CategoryResult): Opportunity | null {
  const hasConversionPath = conversion.checks.some((c) => ['conv-cta', 'conv-phone', 'conv-form'].includes(c.id) && c.status === 'good')
  if (ads.status === 'detected') {
    return {
      id: 'opp-ads-review',
      category: 'advertising',
      title: 'Advertising tracking detected',
      detail: 'Ad tracking tags are configured. An account and performance review could be offered — activity and spend require platform access.',
      evidence: ads.summary,
      certainty: 'research',
      priority: 'low',
    }
  }
  if (!hasConversionPath) return null
  return {
    id: 'opp-ads-potential',
    category: 'advertising',
    title: 'Paid search potential',
    detail: 'Conversion paths exist that paid search could drive traffic to. No advertising tags were detected on this page.',
    evidence: ads.summary,
    certainty: 'potential',
    priority: 'medium',
  }
}

const OOH_OPPORTUNITY: Opportunity = {
  id: 'opp-ooh-research',
  category: 'ooh',
  title: 'OOH suitability requires research',
  detail: 'Whether out-of-home advertising fits depends on campaign location, audience, budget and available inventory.',
  evidence: 'OOH cannot be assessed from a website alone.',
  certainty: 'research',
  priority: 'low',
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 }
const CERTAINTY_RANK: Record<Certainty, number> = { detected: 0, potential: 1, research: 2 }

export function buildOpportunities(categories: Record<CategoryId, CategoryResult>): Opportunity[] {
  const fromChecks = (['website', 'seo', 'conversion', 'local'] as const).flatMap((id) =>
    categories[id].checks.map((check) => opportunityFromCheck(id, check)),
  )

  // Avoid duplicate statements when website and SEO checks flag the same gap.
  const seen = new Set<string>()
  const list = [
    ...fromChecks,
    socialOpportunity(categories.social),
    advertisingOpportunity(categories.advertising, categories.conversion),
    FEATURES.ooh ? OOH_OPPORTUNITY : null,
  ].filter((o): o is Opportunity => {
    if (!o || seen.has(o.title)) return false
    seen.add(o.title)
    return true
  })

  return list.sort(
    (a, b) => CERTAINTY_RANK[a.certainty] - CERTAINTY_RANK[b.certainty] || PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority],
  )
}

/** Opportunities backed by page evidence; "research" items are tracked separately. */
export function countSignals(opportunities: Opportunity[]): number {
  return opportunities.filter((o) => o.certainty !== 'research').length
}
