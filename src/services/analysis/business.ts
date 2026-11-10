import { AU_CITIES, INDUSTRIES } from '../../data/industries'
import { MARKETS, type Market } from '../../data/markets'
import { detectCountry } from './country'
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

function mentions(text: string, name: string): boolean {
  return new RegExp(`\\b${escapeRegExp(name)}\\b`, 'i').test(text)
}

const STREET_WORD =
  /\b(st|street|rd|road|ave|avenue|lane|ln|drive|dr|cross|main|highway|hwy|parade|pde|court|ct|place|pl|way|blvd|boulevard|terrace|tce|crescent|cres|close|floor|level|suite|unit|shop|po box)\b/i

function looksLikeTown(segment: string): boolean {
  return /^[A-Za-z][A-Za-z .'-]{1,30}$/.test(segment) && segment.split(' ').length <= 3 && !STREET_WORD.test(segment)
}

/**
 * The suburb and town written just before the state/postcode, nearest first:
 * "14 Park Street, Clifton, Bristol" → ["Bristol", "Clifton"]; street parts are skipped.
 */
function townsBefore(text: string): string[] {
  const segments = text
    .replace(/[\s,]+$/, '')
    .split(/[,\n·|]/)
    .map((s) => normaliseWhitespace(s))
    .reverse()
  const towns: string[] = []
  for (const segment of segments.slice(0, 3)) {
    if (looksLikeTown(segment)) towns.push(segment)
    else if (towns.length) break
  }
  return towns.slice(0, 2)
}

/** The suburb or town written just before the state/postcode: "12 Church St, Parramatta NSW 2150" → "Parramatta". */
function townBefore(text: string): string | null {
  return townsBefore(text)[0] ?? null
}

/** Australian address: "Parramatta, NSW" from the city list or the suburb, else the matched fragment. */
function auAddressLocation(candidate: string): string | null {
  const match = candidate.match(new RegExp(AU_ADDRESS_PATTERN.source, 'i'))
  if (!match) return null
  const state = match[1]
  const city = AU_CITIES.find((c) => candidate.toLowerCase().includes(c.toLowerCase()))
  const suburb = townBefore(match[0].slice(0, match[0].lastIndexOf(state)))
  return city || suburb ? `${city ?? suburb}, ${state}` : normaliseWhitespace(match[0]).slice(-60)
}

/** Other countries: a known city, else the town written just before the postcode. */
function addressLocation(candidate: string, market: Market): string | null {
  if (market.code === 'AU') return auAddressLocation(candidate)
  const match = market.address.exec(candidate)
  if (!match) return null
  const city = market.cities.find((c) => mentions(candidate, c))
  if (city) return `${city}, ${market.name}`
  const town = townBefore(candidate.slice(0, match.index))
  return town ? `${town}, ${market.name}` : `${normaliseWhitespace(match[0])}, ${market.name}`
}

function detectLocation(page: PageExtraction, country: BusinessProfile['country']): BusinessProfile['location'] {
  const { locality, region } = page.schema
  if (locality || region) {
    return { label: [locality, region].filter(Boolean).join(', '), basis: 'Schema.org address' }
  }

  // A known country narrows the formats to its own; otherwise try all (Australia first).
  const markets = country ? MARKETS.filter((m) => m.code === country.code) : MARKETS
  for (const market of markets) {
    for (const candidate of page.addressCandidates) {
      const label = addressLocation(candidate, market)
      if (label) return { label, basis: 'Address text on the page' }
    }
  }

  const footer = page.footerText ?? ''
  for (const market of markets) {
    const city = market.cities.find((c) => mentions(footer, c))
    if (city) return { label: market.code === 'AU' ? city : `${city}, ${market.name}`, basis: 'City named in the footer' }
  }

  const prominentText = [page.title, page.metaDescription ?? '', ...page.headings.h1].join(' ')
  for (const market of markets) {
    const city = market.cities.find((c) => mentions(prominentText, c))
    if (city) {
      return {
        label: market.code === 'AU' ? city : `${city}, ${market.name}`,
        basis: 'City named in the page title, description or H1',
      }
    }
  }

  return null
}

export interface PlaceCandidate {
  /** Suburb, city or postcode exactly as it would be typed into Google. */
  label: string
  kind: 'city' | 'postcode'
  basis: string
}

const MAX_PLACES = 6

/**
 * Every suburb/city and postcode in one address, suburb first:
 * "12 Church St, Parramatta NSW 2150" → [Parramatta], 2150;
 * "14 Park Street, Clifton, Bristol BS8 1HE" → [Clifton, Bristol], BS8 1HE.
 */
function placesInAddress(text: string, market: Market): { towns: string[]; postcode: string | null }[] {
  const found: { towns: string[]; postcode: string | null }[] = []
  if (market.code === 'AU') {
    for (const match of text.matchAll(new RegExp(AU_ADDRESS_PATTERN.source, 'gi'))) {
      const state = match[1] ?? ''
      const towns = townsBefore(match[0].slice(0, match[0].lastIndexOf(state)))
      const city = AU_CITIES.find((c) => mentions(match[0], c))
      found.push({
        towns: [...towns.reverse(), ...(city && !towns.includes(city) ? [city] : [])],
        postcode: match[0].match(/(\d{4})\s*$/)?.[1] ?? null,
      })
    }
    return found
  }
  const flags = market.address.flags.includes('g') ? market.address.flags : `${market.address.flags}g`
  // Only the text since the previous address, so one branch's suburb isn't read as the next one's.
  let from = 0
  for (const match of text.matchAll(new RegExp(market.address.source, flags))) {
    const towns = townsBefore(text.slice(from, match.index)).reverse()
    const city = market.cities.find((c) => mentions(match[0], c))
    found.push({
      towns: [...towns, ...(city && !towns.includes(city) ? [city] : [])],
      postcode: market.postcode ? (match[0].match(market.postcode)?.[0] ?? null) : null,
    })
    from = (match.index ?? 0) + match[0].length
  }
  return found
}

/**
 * Suburbs, cities and postcodes the business serves, from schema, every
 * address on the page (multi-branch sites list several) and the footer.
 * Used to check rankings place by place ("plumber parramatta", "plumber 2150").
 */
/** The parts of a page that addresses are read from (also built from competitor sites' HTML). */
export type AddressSource = Pick<PageExtraction, 'schema' | 'addressCandidates' | 'footerText' | 'title' | 'headings'>

const AU_STATES: Record<string, string> = {
  victoria: 'VIC',
  'new south wales': 'NSW',
  queensland: 'QLD',
  tasmania: 'TAS',
  'western australia': 'WA',
  'south australia': 'SA',
  'australian capital territory': 'ACT',
  'northern territory': 'NT',
}

/** State or region the address is in ("NSW", "Ontario"), from schema or an Australian address. */
export function detectRegion(page: AddressSource): string | null {
  const schemaRegion = page.schema.region?.trim()
  if (schemaRegion) return AU_STATES[schemaRegion.toLowerCase()] ?? schemaRegion.toUpperCase()
  for (const text of [...page.addressCandidates, page.footerText ?? '']) {
    const state = text.match(new RegExp(AU_ADDRESS_PATTERN.source, 'i'))?.[1]
    if (state) return AU_STATES[state.toLowerCase()] ?? state.toUpperCase()
  }
  return null
}

export function detectPlaces(page: AddressSource, country: BusinessProfile['country']): PlaceCandidate[] {
  const out: PlaceCandidate[] = []
  const seen = new Set<string>()
  const add = (label: string | null | undefined, kind: PlaceCandidate['kind'], basis: string) => {
    const clean = normaliseWhitespace(label ?? '')
    if (!clean || seen.has(clean.toLowerCase()) || out.length >= MAX_PLACES) return
    seen.add(clean.toLowerCase())
    out.push({ label: clean, kind, basis })
  }

  add(page.schema.locality, 'city', 'Schema.org address')
  add(page.schema.postcode, 'postcode', 'Schema.org address')

  const markets = country ? MARKETS.filter((m) => m.code === country.code) : MARKETS
  const sources: [string, string][] = [
    ...page.addressCandidates.map((a): [string, string] => [a, 'Address on the page']),
    [page.footerText ?? '', 'Footer'],
  ]
  for (const market of markets) {
    for (const [text, basis] of sources) {
      for (const place of placesInAddress(text, market)) {
        for (const town of place.towns) add(town, 'city', basis)
        add(place.postcode, 'postcode', basis)
      }
    }
    if (out.length) break
  }

  // No full address: fall back to a city named in the footer, title or H1.
  if (out.length === 0) {
    const prominent = [page.footerText ?? '', page.title, ...page.headings.h1].join(' ')
    for (const market of markets) {
      const city = market.cities.find((c) => mentions(prominent, c))
      if (city) {
        add(city, 'city', 'City named on the page')
        break
      }
    }
  }
  return out
}

export function detectBusiness(page: PageExtraction): BusinessProfile {
  const country = detectCountry(page)
  return {
    ...detectName(page),
    domain: page.domain,
    url: page.url,
    industry: detectIndustry(page),
    location: detectLocation(page, country),
    country,
    socialPlatforms: page.socialLinks.map((s) => s.platform),
  }
}

export function hasPhysicalFootprint(profile: BusinessProfile): boolean {
  if (!profile.industry) return false
  return INDUSTRIES.find((i) => i.id === profile.industry?.id)?.physicalFootprint ?? false
}
