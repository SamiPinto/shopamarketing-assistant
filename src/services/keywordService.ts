import { INDUSTRIES } from '../data/industries'
import { registrableDomain } from '../data/providers'
import { matchesDomain } from '../data/directories'
import { MARKETS, WORLDWIDE } from '../data/markets'
import type { IndustryId, MarketingAnalysis } from '../types/analysis'
import type {
  KeywordCandidate,
  KeywordRanking,
  KeywordVolume,
  KeywordReport,
  SearchCompetitor,
  SearchPlace,
} from '../types/keywords'
import { detectPlaces } from './analysis/business'
import { detectCountry } from './analysis/country'
import { autocomplete, type SearchMarket } from './googleSerpService'
import { storageService } from './storageService'

/**
 * Keyword research without a paid data provider. Service keywords come from
 * what the site says about itself (title, headings, schema type), optionally
 * expanded with Google Autocomplete. Each service is searched in each suburb,
 * city or postcode the business serves ("blocked drains 2150"), because that
 * is how local customers search and it works from any computer. Ranking data
 * comes from googleSerpService. There are no search volumes, so "best
 * keyword" is judged from position, competition and buyer intent.
 */

const MAX_SUGGESTIONS = 20
/** Services ticked by default; each is searched in every selected place. */
export const DEFAULT_SELECTED = 5
export const MAX_SELECTED = 15
export const DEFAULT_PLACES = 2
export const MAX_PLACES = 6
/** Cap on services × places, to keep Google from blocking the run. */
export const MAX_SEARCHES = 24

const GENERIC_PHRASE =
  /^(home( ?page)?|welcome|about|about us|contact|contact us|get in touch|our (services|team|story|work|clients|people|process)|services|what we do|who we are|why choose us|why us|faqs?|frequently asked questions|blog|news|latest news|testimonials|reviews|gallery|portfolio|book (now|online|today)|call (us|now|today)|enquire( now)?|menu|shop|shop now|login|log in|sign in|sign up|privacy policy|terms.*|follow us|subscribe|newsletter|read more|learn more|view all|our location|locations?|opening hours|hours|find us|meet the team|careers|join our team|specials|offers|resources|page not found|untitled)$/

const STOP_WORDS = new Set(['and', 'the', 'a', 'an', 'of', 'for', 'to', 'in', 'on', 'with', 'at', 'by', 'our', 'your', 'we', 'you', 'is', 'are', 'us'])

// Schema types that say nothing about what the business does.
const GENERIC_SCHEMA = new Set([
  'organization', 'localbusiness', 'website', 'webpage', 'breadcrumblist', 'imageobject', 'person',
  'place', 'postaladdress', 'searchaction', 'sitenavigationelement', 'wpheader', 'wpfooter', 'thing', 'faqpage',
  'question', 'answer', 'article', 'blogposting', 'readaction', 'listitem', 'itemlist', 'aggregaterating',
  'review', 'rating', 'openinghoursspecification', 'geocoordinates', 'contactpoint', 'offer', 'service',
  'professionalservice', 'collectionpage', 'aboutpage', 'contactpage', 'product', 'brand', 'corporation',
])

// Research questions ("how to unblock a drain") rarely turn into enquiries.
const QUESTION = /^(what|why|how|when|who|where|which|can|does|do|is|are|should|will|diy)\b/

function clean(text: string): string {
  return text
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b24\s*\/\s*7\b/g, '24 hour')
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(welcome to|the|our|your) /, '')
}

function wordsOf(text: string): string[] {
  return text.split(' ').filter(Boolean)
}

/** "HVACBusiness" → "hvac business", "Dentist" → "dentist". */
function schemaPhrase(type: string): string {
  return type.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').toLowerCase()
}

/**
 * Suburbs, cities and postcodes to search in, from every address on the site;
 * falls back to the detected location ("Parramatta, NSW" → "Parramatta").
 */
export function suggestPlaces(analysis: MarketingAnalysis): SearchPlace[] {
  const found = detectPlaces(analysis.page, detectedCountry(analysis))
  if (found.length) return found
  const location = analysis.business.location
  const first = normaliseKeyword(location?.label.split(',')[0] ?? '')
  // State and province codes on their own ("NSW", "TX") and country names aren't useful places.
  if (!location || !first || /\d/.test(first) || first.length <= 3 || wordsOf(first).length > 3) return []
  if (MARKETS.some((m) => m.names.includes(first))) return []
  return [{ label: location.label.split(',')[0]!.trim(), kind: 'city', basis: location.basis }]
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Place words to strip from service phrases: the site's own places plus known city names. */
function placeTokens(analysis: MarketingAnalysis): string[] {
  const country = detectedCountry(analysis)
  const markets = country ? MARKETS.filter((m) => m.code === country.code) : MARKETS
  const tokens = [...suggestPlaces(analysis).map((p) => p.label), ...markets.flatMap((m) => m.cities)]
  // Longest first so "gold coast" goes before "coast"-like fragments.
  return [...new Set(tokens.map((t) => clean(t)).filter(Boolean))].sort((a, b) => b.length - a.length)
}

/** "emergency plumber parramatta" → "emergency plumber"; "dentist in brisbane cbd" → "dentist". */
function stripPlaces(phrase: string, tokens: string[]): string {
  let out = phrase
  for (const token of tokens) {
    out = out.replace(new RegExp(`\\b(?:in|near|around|at)?\\s*${escapeRegExp(token)}(?:\\s+cbd)?\\b`, 'g'), ' ')
  }
  return out
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(and|in|at|for|by|of|near) |( and| in| at| for| by| of| near)$/g, '')
    .trim()
}

/** The service part of a search the site ranks for, without the site's places: "plumber parramatta" → "plumber". */
export function serviceFromKeyword(analysis: MarketingAnalysis, keyword: string): string {
  return stripPlaces(normaliseKeyword(keyword), placeTokens(analysis)) || normaliseKeyword(keyword)
}

/**
 * The Google search for a service in a place: "blocked drains" + "2150" → "blocked drains 2150".
 * "Best …" searches read naturally with "in": "best child care" + "Colyton" → "best child care in colyton".
 */
export function queryFor(service: string, place: string | null): string {
  if (!place) return service
  const p = normaliseKeyword(place)
  if (service.includes(p)) return service
  return /^best /.test(service) ? `${service} in ${p}` : `${service} ${p}`
}

export interface MarketChoice extends SearchMarket {
  /** MarketCode, or "WW" for worldwide google.com. */
  code: string
  name: string
}

export const WORLDWIDE_CHOICE: MarketChoice = { code: 'WW', ...WORLDWIDE }

export const MARKET_CHOICES: MarketChoice[] = [
  ...MARKETS.map((m) => ({ code: m.code, name: m.name, googleHost: m.googleHost, gl: m.gl })),
  WORLDWIDE_CHOICE,
]

export function marketChoice(code: string | null | undefined): MarketChoice {
  return MARKET_CHOICES.find((m) => m.code === code) ?? WORLDWIDE_CHOICE
}

/** The country detected for the business, or null when the site doesn't make it clear. */
export function detectedCountry(analysis: MarketingAnalysis): MarketingAnalysis['business']['country'] {
  // Analyses saved before country detection existed don't have the field; work it out now.
  return analysis.business.country === undefined ? detectCountry(analysis.page) : analysis.business.country
}

function brandTokens(analysis: MarketingAnalysis): string[] {
  const stem = analysis.business.domain.replace(/^www\./, '').split('.')[0] ?? ''
  return [clean(analysis.business.name), stem.toLowerCase()].filter((t) => t.length >= 3)
}

function isUsable(phrase: string, brands: string[]): boolean {
  const words = wordsOf(phrase)
  if (words.length === 0 || words.length > 5) return false
  if (phrase.length < 3 || phrase.length > 45) return false
  if (GENERIC_PHRASE.test(phrase)) return false
  if (/\d{4,}/.test(phrase)) return false
  if (words.every((w) => STOP_WORDS.has(w))) return false
  // Brand searches always rank the site first, so they say nothing useful.
  if (brands.some((b) => phrase.includes(b))) return false
  return true
}

interface Seed {
  phrase: string
  score: number
  basis: string
}

function collectSeeds(analysis: MarketingAnalysis): Seed[] {
  const { page } = analysis
  const brands = brandTokens(analysis)
  const places = placeTokens(analysis)
  const industry = INDUSTRIES.find((i) => i.id === analysis.business.industry?.id)
  const seeds = new Map<string, Seed>()

  const add = (raw: string, weight: number, basis: string) => {
    let phrase = clean(raw)
    for (const b of brands) phrase = phrase.replace(b, ' ').replace(/\s+/g, ' ').trim()
    // Seeds are services only; places are added per search ("service + suburb").
    phrase = stripPlaces(phrase, places)
    if (!isUsable(phrase, brands)) return
    const existing = seeds.get(phrase)
    if (existing) existing.score += weight
    else seeds.set(phrase, { phrase, score: weight, basis })
  }

  for (const part of page.title.split(/\s[|\-–—:•·]\s|\s?[|•·]\s?/)) add(part, 3, 'Page title')
  for (const h of page.headings.h1) add(h, 3, 'H1 heading')
  for (const h of page.headings.h2.slice(0, 15)) add(h, 2, 'H2 heading')
  for (const h of page.headings.h3.slice(0, 15)) add(h, 1, 'H3 heading')
  for (const type of page.schema.types) {
    if (!GENERIC_SCHEMA.has(type.toLowerCase())) add(schemaPhrase(type), 2, 'Schema.org business type')
  }

  // Phrases that use the industry's own vocabulary are far more likely to be real searches.
  if (industry) {
    for (const seed of seeds.values()) {
      if (industry.keywords.some((k) => seed.phrase.includes(k.trim()))) seed.score += 3
    }
  }

  return [...seeds.values()].sort((a, b) => b.score - a.score || a.phrase.length - b.phrase.length)
}

/** Service keyword ideas from the analysed page only (instant, no network). */
// Schema types too broad to name the business in a search ("best educational organization").
const VAGUE_SCHEMA = /\b(organization|business|establishment|location|service|store)$/

// What people search for when the site gives no better name, by industry.
const INDUSTRY_SEARCH_NAME: Partial<Record<IndustryId, string>> = {
  dental: 'dentist',
  medical: 'doctor',
  fitness: 'gym',
  hospitality: 'restaurant',
  legal: 'lawyer',
  'real-estate': 'real estate agent',
  automotive: 'mechanic',
  beauty: 'beauty salon',
  finance: 'accountant',
  construction: 'builder',
}

/** What the business is, in the words people search: "child care", "dentist", "plumber". */
// People search for the tradesperson, not the trade: "best plumber", not "best plumbing".
const TRADESPERSON: Record<string, string> = {
  plumbing: 'plumber',
  electrical: 'electrician',
  roofing: 'roofer',
  painting: 'painter',
  landscaping: 'landscaper',
  cleaning: 'cleaner',
  carpentry: 'carpenter',
  tiling: 'tiler',
  fencing: 'fencer',
  concreting: 'concreter',
  plastering: 'plasterer',
  bricklaying: 'bricklayer',
}

function mainService(analysis: MarketingAnalysis, seeds: Seed[]): string | null {
  const strip = (phrase: string) => {
    const out = phrase.replace(/^best /, '')
    return TRADESPERSON[out] ?? out
  }
  // A specific schema type ("ChildCare", "Dentist") is the clearest statement.
  for (const type of analysis.page.schema.types) {
    const phrase = clean(schemaPhrase(type))
    if (!GENERIC_SCHEMA.has(type.toLowerCase()) && phrase && !VAGUE_SCHEMA.test(phrase) && wordsOf(phrase).length <= 3) {
      return strip(phrase)
    }
  }
  // Otherwise the site's strongest short service phrase, preferring the industry's own words.
  const industry = INDUSTRIES.find((i) => i.id === analysis.business.industry?.id)
  const short = seeds.filter((s) => wordsOf(s.phrase).length <= 3)
  const best = short.find((s) => industry?.keywords.some((k) => s.phrase.includes(k.trim()))) ?? short[0]
  if (best) return strip(best.phrase)
  return analysis.business.industry ? (INDUSTRY_SEARCH_NAME[analysis.business.industry.id] ?? null) : null
}

export function suggestFromSite(analysis: MarketingAnalysis): KeywordCandidate[] {
  const seeds = collectSeeds(analysis)
  const ideas: KeywordCandidate[] = seeds
    .slice(0, MAX_SUGGESTIONS)
    .map((seed) => ({ keyword: seed.phrase, source: 'site', basis: seed.basis }))
  // "best child care", searched as "best child care in colyton": how people compare local businesses.
  const main = mainService(analysis, seeds)
  if (!main) return ideas
  const best = `best ${main}`
  return [
    { keyword: best, source: 'site', basis: `“best” + main service, searched as “${best} in <location>”` },
    ...ideas.filter((c) => c.keyword !== best),
  ]
}

/** Real searches from Google Autocomplete that extend the top site keywords. */
export async function suggestFromAutocomplete(
  analysis: MarketingAnalysis,
  existing: KeywordCandidate[],
  market: SearchMarket,
  place: string | null,
): Promise<KeywordCandidate[]> {
  const brands = brandTokens(analysis)
  const places = placeTokens(analysis)
  const seeds = collectSeeds(analysis).slice(0, 4)
  const seen = new Set(existing.map((c) => c.keyword))
  const out: KeywordCandidate[] = []

  for (const seed of seeds) {
    // Ask for the service in the first place so suggestions are local, then keep only the service part.
    const query = place ? queryFor(seed.phrase, place) : `${seed.phrase} `
    const seedWords = wordsOf(seed.phrase).filter((w) => !STOP_WORDS.has(w))
    let added = 0
    for (const suggestion of await autocomplete(query, market)) {
      const keyword = stripPlaces(clean(suggestion).replace(/\b\d{3,}\b/g, ' '), places)
      if (seen.has(keyword) || !isUsable(keyword, brands) || wordsOf(keyword).length > 6) continue
      if (QUESTION.test(keyword)) continue
      if (!seedWords.some((w) => keyword.includes(w))) continue
      seen.add(keyword)
      out.push({ keyword, source: 'autocomplete', basis: `Google Autocomplete for “${query.trim()}”` })
      if (++added >= 3) break
    }
  }
  return out
}

export function normaliseKeyword(input: string): string {
  return clean(input)
}

/** Google page a position was found on. Older results without a page fall back to 10 per page. */
export function pageOf(ranking: KeywordRanking, position: number): number {
  return ranking.results.find((r) => r.position === position)?.page ?? Math.ceil(position / 10)
}

/** DataForSEO search volume for a keyword: undefined when the report has no volumes. */
export function volumeOf(report: KeywordReport, keyword: string): KeywordVolume | undefined {
  return report.volumes?.[keyword.toLowerCase().trim()]
}

/** Service (row) and place (column) of a ranking; older reports only have the full keyword. */
export function serviceOf(ranking: KeywordRanking): string {
  return ranking.service ?? ranking.keyword
}

/** Places of a report in column order, or [] when it wasn't searched place by place. */
export function reportPlaces(report: KeywordReport): string[] {
  return report.places ?? [...new Set(report.keywords.map((k) => k.place).filter((p): p is string => Boolean(p)))]
}

/** Domains that keep showing up for the same searches: the real search competitors. */
export function searchCompetitors(report: KeywordReport, limit = 5): SearchCompetitor[] {
  const byDomain = new Map<string, number[]>()
  for (const ranking of report.keywords) {
    const best = new Map<string, number>()
    for (const r of ranking.results) {
      if (r.directory || matchesDomain(r.domain, report.domain)) continue
      if (!best.has(r.domain)) best.set(r.domain, r.position)
    }
    for (const [domain, position] of best) byDomain.set(domain, [...(byDomain.get(domain) ?? []), position])
  }
  return [...byDomain.entries()]
    .map(([domain, positions]) => ({
      domain,
      keywordCount: positions.length,
      bestPosition: Math.min(...positions),
      averagePosition: Math.round((positions.reduce((s, p) => s + p, 0) / positions.length) * 10) / 10,
    }))
    // A domain seen for a single keyword is usually noise, unless few keywords were checked.
    .filter((c) => c.keywordCount >= 2 || report.keywords.length <= 3)
    .sort((a, b) => b.keywordCount - a.keywordCount || a.averagePosition - b.averagePosition)
    .slice(0, limit)
}

/** A domain's best position for a keyword, or null when it isn't in the pages checked. */
export function positionOf(ranking: KeywordRanking, domain: string): number | null {
  return ranking.results.find((r) => matchesDomain(r.domain, domain))?.position ?? null
}

export function reportDomain(analysis: MarketingAnalysis): string {
  return registrableDomain(analysis.business.domain)
}

export const keywordStore = {
  get: (domain: string) => storageService.getKeywordReport(domain),
  save: (report: KeywordReport) => storageService.saveKeywordReport(report),
}
