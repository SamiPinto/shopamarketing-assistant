import { AU_CITIES, INDUSTRIES } from '../../data/industries'
import type { BusinessProfile } from '../../types/analysis'
import type { PageExtraction } from '../../types/page'
import { AU_ADDRESS_PATTERN, normaliseWhitespace } from '../../utils/signals'

const GENERIC_TITLE_SEGMENTS = /^(home|homepage|welcome|index|official site|official website)$/i

function nameFromDomain(domain: string): string {
  const label = domain.split('.')[0] ?? domain
  return label
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

/** Picks the title segment that best matches the domain, ignoring "Home" etc. */
function nameFromTitle(title: string, domain: string): string | null {
  const segments = title
    .split(/\s[|–—\-:·•]\s|\s\|\s?|\|/)
    .map((s) => normaliseWhitespace(s))
    .filter((s) => s.length > 1 && s.length <= 60 && !GENERIC_TITLE_SEGMENTS.test(s))
  if (segments.length === 0) return null
  const domainKey = (domain.split('.')[0] ?? '').replace(/[^a-z0-9]/gi, '').toLowerCase()
  const scored = segments.map((segment) => {
    const words = segment.toLowerCase().split(/\s+/)
    const overlap = words.filter((w) => w.length > 2 && domainKey.includes(w.replace(/[^a-z0-9]/g, ''))).length
    return { segment, overlap }
  })
  scored.sort((a, b) => b.overlap - a.overlap)
  return scored[0].overlap > 0 ? scored[0].segment : segments[segments.length > 1 ? segments.length - 1 : 0]
}

function detectName(page: PageExtraction): Pick<BusinessProfile, 'name' | 'nameSource'> {
  if (page.schema.name) return { name: page.schema.name, nameSource: 'schema' }
  if (page.openGraph.siteName) return { name: page.openGraph.siteName, nameSource: 'open-graph' }
  const fromTitle = page.title ? nameFromTitle(page.title, page.domain) : null
  if (fromTitle) return { name: fromTitle, nameSource: 'title' }
  return { name: nameFromDomain(page.domain), nameSource: 'domain' }
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function detectIndustry(page: PageExtraction): BusinessProfile['industry'] {
  const schemaMatch = INDUSTRIES.find((industry) =>
    page.schema.types.some((t) => industry.schemaTypes.includes(t)),
  )
  if (schemaMatch) {
    const type = page.schema.types.find((t) => schemaMatch.schemaTypes.includes(t))
    return { id: schemaMatch.id, label: schemaMatch.label, basis: `Schema.org type "${type}"` }
  }

  const haystack = [
    page.title,
    page.metaDescription ?? '',
    page.openGraph.description ?? '',
    ...page.headings.h1,
    ...page.headings.h2.slice(0, 10),
  ]
    .join(' ')
    .toLowerCase()

  let best: { industry: (typeof INDUSTRIES)[number]; hits: number } | null = null
  for (const industry of INDUSTRIES) {
    // Word-start matching so "car" doesn't match "care" mid-word but "plumb" matches "plumbing".
    const hits = industry.keywords.filter((k) => new RegExp(`\\b${escapeRegExp(k)}`).test(haystack)).length
    if (hits > (best?.hits ?? 0)) best = { industry, hits }
  }
  // Require two distinct keyword hits to avoid labelling on a single stray word.
  if (!best || best.hits < 2) return null
  return {
    id: best.industry.id,
    label: best.industry.label,
    basis: 'Inferred from keywords in the page title, description and headings',
  }
}

function detectLocation(page: PageExtraction): BusinessProfile['location'] {
  const { locality, region } = page.schema
  if (locality || region) {
    return { label: [locality, region].filter(Boolean).join(', '), basis: 'Schema.org address' }
  }

  for (const candidate of page.addressCandidates) {
    const match = candidate.match(new RegExp(AU_ADDRESS_PATTERN.source, 'i'))
    if (match) {
      const city = AU_CITIES.find((c) => candidate.toLowerCase().includes(c.toLowerCase()))
      const state = match[1]
      return {
        label: city ? `${city}, ${state}` : normaliseWhitespace(match[0]).slice(-60),
        basis: 'Address text on the page',
      }
    }
  }

  const prominentText = [page.title, page.metaDescription ?? '', ...page.headings.h1].join(' ')
  const city = AU_CITIES.find((c) => new RegExp(`\\b${c}\\b`, 'i').test(prominentText))
  if (city) return { label: city, basis: 'City named in the page title, description or H1' }

  return null
}

export function detectBusiness(page: PageExtraction): BusinessProfile {
  return {
    ...detectName(page),
    domain: page.domain,
    url: page.url,
    industry: detectIndustry(page),
    location: detectLocation(page),
    socialPlatforms: page.socialLinks.map((s) => s.platform),
  }
}

export function hasPhysicalFootprint(profile: BusinessProfile): boolean {
  if (!profile.industry) return false
  return INDUSTRIES.find((i) => i.id === profile.industry?.id)?.physicalFootprint ?? false
}
