import { MARKETS } from '../data/markets'
import type { BusinessProfile } from '../types/analysis'
import type { CompetitorLocation, LocalMatch, SearchPlace } from '../types/keywords'
import type { SchemaSummary } from '../types/page'
import { isExtensionContext } from '../utils/chrome'
import { AU_ADDRESS_PATTERN, normaliseWhitespace } from '../utils/signals'
import { detectPlaces, detectRegion, type AddressSource } from './analysis/business'
import { storageService } from './storageService'

/**
 * Finds where search competitors are by reading their own websites, the same
 * way the client's site is read: schema.org address, <address> blocks,
 * address-formatted text and the footer. The homepage is tried first, then
 * one contact/location page. HTML is parsed without running its scripts, so
 * sites that only render with JavaScript may come back "unknown".
 */

const FETCH_TIMEOUT_MS = 10_000
const CACHE_TTL_MS = 30 * 86_400_000
const CONCURRENCY = 3
const CONTACT_LINK = /contact|location|find[- ]?us|our[- ]?clinics?|branches|stores?|visit/i

// Free, keyless OpenStreetMap geocoder: suburb / pincode → map position.
const GEOCODER = 'https://photon.komoot.io'
/** Within this distance a competitor counts as nearby. */
export const NEARBY_KM = 15

function originsFor(domain: string): string[] {
  return [`https://${domain}/*`, `https://www.${domain}/*`]
}

/** Must be called synchronously from a click so Chrome can show the prompt. */
export function requestSiteAccess(domains: string[]): Promise<boolean> {
  if (!isExtensionContext()) return Promise.resolve(false)
  return chrome.permissions
    .request({ origins: [...domains.flatMap(originsFor), `${GEOCODER}/*`] })
    .catch(() => false)
}

const geocodeCache = new Map<string, Promise<{ lat: number; lon: number } | null>>()

/** Map position of a place such as "Concord 2137 NSW Australia". Never throws. */
export function geocode(query: string): Promise<{ lat: number; lon: number } | null> {
  const key = query.toLowerCase()
  const cached = geocodeCache.get(key)
  if (cached) return cached
  const result = (async () => {
    try {
      const response = await fetch(`${GEOCODER}/api/?limit=1&q=${encodeURIComponent(query)}`, { credentials: 'omit' })
      if (!response.ok) return null
      const data = (await response.json()) as { features?: { geometry?: { coordinates?: [number, number] } }[] }
      const [lon, lat] = data.features?.[0]?.geometry?.coordinates ?? []
      return typeof lat === 'number' && typeof lon === 'number' ? { lat, lon } : null
    } catch {
      return null
    }
  })()
  geocodeCache.set(key, result)
  return result
}

/** Town + pincode + state + country, the most precise query for the geocoder. */
export function placeQuery(places: string[], region: string | null, countryName: string | null): string | null {
  const town = places.find((p) => !/\d/.test(p))
  const postcode = places.find((p) => /\d/.test(p))
  if (!town && !postcode) return null
  return [town, postcode, region, countryName].filter(Boolean).join(' ')
}

export function distanceKm(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const rad = (d: number) => (d * Math.PI) / 180
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

async function fetchDocument(url: string): Promise<{ doc: Document; url: string } | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetch(url, { signal: controller.signal, credentials: 'omit', redirect: 'follow' })
    if (!response.ok || !(response.headers.get('content-type') ?? '').includes('html')) return null
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html')
    for (const el of Array.from(doc.querySelectorAll('script:not([type="application/ld+json"]), style, noscript, template'))) {
      el.remove()
    }
    return { doc, url: response.url || url }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

type Json = Record<string, unknown>
const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null)

/** Address fields from the first JSON-LD node that has a PostalAddress. */
function schemaAddress(doc: Document): Partial<SchemaSummary> {
  const nodes: Json[] = []
  const collect = (value: unknown, depth = 0) => {
    if (depth > 6 || !value || typeof value !== 'object') return
    if (Array.isArray(value)) return value.forEach((v) => collect(v, depth + 1))
    nodes.push(value as Json)
    for (const key of ['@graph', 'location', 'department', 'subOrganization']) collect((value as Json)[key], depth + 1)
  }
  for (const block of Array.from(doc.querySelectorAll('script[type="application/ld+json"]'))) {
    try {
      collect(JSON.parse(block.textContent ?? ''))
    } catch {
      // Malformed JSON-LD is common; skip it.
    }
  }
  for (const node of nodes) {
    const raw = Array.isArray(node.address) ? node.address[0] : node.address
    const addr = raw && typeof raw === 'object' ? (raw as Json) : null
    if (!addr) continue
    return {
      streetAddress: str(addr.streetAddress),
      locality: str(addr.addressLocality),
      region: str(addr.addressRegion),
      postcode: str(addr.postalCode),
      country: str(addr.addressCountry) ?? str((addr.addressCountry as Json | undefined)?.name),
    }
  }
  return {}
}

function textOf(el: Element | null): string {
  return normaliseWhitespace(el?.textContent ?? '')
}

/** Builds the same address inputs the content script produces for the client's own site. */
function addressSource(doc: Document): AddressSource {
  const schema = schemaAddress(doc)
  const bodyText = textOf(doc.body).slice(0, 150_000)
  const footerText = textOf(doc.querySelector('footer, [role="contentinfo"], #footer, .footer, [class*="footer" i]')).slice(0, 1200)
  const fromElements = Array.from(doc.querySelectorAll('address, [itemprop="address"], [class*="address" i]'))
    .slice(0, 10)
    .map((el) => textOf(el).slice(0, 160))
    .filter((t) => t.length > 8)
  const fromText = (bodyText.match(AU_ADDRESS_PATTERN) ?? []).map(normaliseWhitespace)
  const international = MARKETS.filter((m) => m.code !== 'AU').flatMap((m) => {
    const match = new RegExp(`[A-Za-z0-9 ,.'/-]{0,60}(?:${m.address.source})`, m.address.flags).exec(`${footerText}\n${bodyText}`)
    return match ? [normaliseWhitespace(match[0])] : []
  })
  return {
    title: textOf(doc.querySelector('title')),
    headings: { h1: Array.from(doc.querySelectorAll('h1')).map(textOf).slice(0, 5), h2: [], h3: [] },
    footerText,
    addressCandidates: [...new Set([...fromElements, ...fromText, ...international])].slice(0, 8),
    schema: {
      types: [],
      blockCount: 0,
      name: null,
      telephone: null,
      locality: schema.locality ?? null,
      region: schema.region ?? null,
      postcode: schema.postcode ?? null,
      streetAddress: schema.streetAddress ?? null,
      country: schema.country ?? null,
    },
  }
}

function readLocation(source: AddressSource, country: BusinessProfile['country']) {
  const places = detectPlaces(source, country).map((p) => p.label)
  const { streetAddress, locality, postcode } = source.schema
  const address =
    [streetAddress, locality, postcode].filter(Boolean).join(', ') ||
    source.addressCandidates.find((a) => places.some((p) => a.toLowerCase().includes(p.toLowerCase()))) ||
    null
  return { places, region: detectRegion(source), address: address ? address.slice(0, 120) : null }
}

/** Reads one competitor's homepage, then a contact/location page if the homepage has no address. */
async function locate(domain: string, siteUrl: string, country: BusinessProfile['country']): Promise<CompetitorLocation> {
  const base = { domain, checkedAt: new Date().toISOString() }
  const home = (await fetchDocument(siteUrl)) ?? (await fetchDocument(`https://${domain}/`))
  if (!home) return { ...base, url: null, address: null, places: [], region: null, error: 'Website could not be read.' }

  const withPoint = async (found: ReturnType<typeof readLocation>) => {
    const query = placeQuery(found.places, found.region, country?.name ?? null)
    return { ...found, point: query ? await geocode(query) : null }
  }

  const fromHome = readLocation(addressSource(home.doc), country)
  if (fromHome.places.length) return { ...base, url: home.url, ...(await withPoint(fromHome)), error: null }

  const homeHost = new URL(home.url).hostname
  const contact = Array.from(home.doc.querySelectorAll<HTMLAnchorElement>('a[href]'))
    .map((a) => {
      try {
        return { url: new URL(a.getAttribute('href') ?? '', home.url), text: textOf(a) }
      } catch {
        return null
      }
    })
    .find((l) => l && l.url.hostname === homeHost && (CONTACT_LINK.test(l.url.pathname) || CONTACT_LINK.test(l.text)))
  if (contact) {
    const page = await fetchDocument(contact.url.href)
    if (page) {
      const fromContact = readLocation(addressSource(page.doc), country)
      if (fromContact.places.length) return { ...base, url: page.url, ...(await withPoint(fromContact)), error: null }
    }
  }
  return {
    ...base,
    url: home.url,
    places: [],
    region: fromHome.region,
    address: null,
    error: 'No address found on the homepage or contact page.',
  }
}

const isFresh = (loc: CompetitorLocation) => Date.now() - new Date(loc.checkedAt).getTime() < CACHE_TTL_MS

export const competitorLocationService = {
  /** Cached locations that are still fresh, by domain. */
  async cached(domains: string[]): Promise<Record<string, CompetitorLocation>> {
    const all = await storageService.getCompetitorLocations()
    return Object.fromEntries(domains.flatMap((d) => (all[d] && isFresh(all[d]) ? [[d, all[d]]] : [])))
  },

  /** Looks up each site (a few at a time), saving each result as it arrives. */
  async locateAll(
    sites: { domain: string; url: string }[],
    country: BusinessProfile['country'],
    onResult: (location: CompetitorLocation) => void,
  ): Promise<void> {
    const queue = [...sites]
    // Saves go one at a time: parallel read-modify-writes of the same map would lose entries.
    let saving = Promise.resolve()
    const worker = async () => {
      for (let site = queue.shift(); site; site = queue.shift()) {
        const location = await locate(site.domain, site.url, country)
        saving = saving.then(() => storageService.saveCompetitorLocation(location))
        onResult(location)
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, sites.length) }, worker))
    await saving
  },
}

const norm = (s: string) => s.toLowerCase().replace(/\s+/g, '')

export interface ClientArea {
  places: SearchPlace[]
  region: string | null
  /** Map positions of the client's locations (one per branch area). */
  points: { lat: number; lon: number }[]
}

/**
 * How close a competitor is to the client: same pincode or suburb by name,
 * else by map distance to the nearest client location (within NEARBY_KM).
 */
export function localMatch(
  location: CompetitorLocation | undefined,
  client: ClientArea,
): { match: LocalMatch; km: number | null } {
  if (!location || (location.places.length === 0 && !location.region)) return { match: 'unknown', km: null }
  const point = location.point
  const km = point && client.points.length ? Math.min(...client.points.map((p) => distanceKm(p, point))) : null
  const theirs = new Set(location.places.map(norm))
  const postcodes = client.places.filter((p) => /\d/.test(p.label))
  const towns = client.places.filter((p) => !/\d/.test(p.label))
  if (postcodes.some((p) => theirs.has(norm(p.label)))) return { match: 'same-postcode', km }
  if (towns.some((p) => theirs.has(norm(p.label)))) return { match: 'same-suburb', km }
  if (km !== null && km <= NEARBY_KM) return { match: 'nearby', km }
  if (client.region && location.region && norm(client.region) === norm(location.region)) return { match: 'same-region', km }
  return { match: location.places.length ? 'elsewhere' : 'unknown', km }
}

export const LOCAL_MATCH_LABEL: Record<LocalMatch, { label: string; tone: string }> = {
  'same-postcode': { label: 'Same pincode', tone: 'good' },
  'same-suburb': { label: 'Same suburb / city', tone: 'good' },
  nearby: { label: 'Nearby', tone: 'info' },
  'same-region': { label: 'Same state', tone: 'attention' },
  elsewhere: { label: 'Elsewhere', tone: 'absent' },
  unknown: { label: 'Address not found', tone: 'detected' },
}

/**
 * Matches kept when "local competitors only" is on. A whole state is too wide
 * for a suburb business; unknown is kept (and labelled) so a site that couldn't
 * be read isn't silently dropped.
 */
export function isLocal(match: LocalMatch): boolean {
  return match !== 'elsewhere' && match !== 'same-region'
}

/** Access to the map lookup alone. Must be called synchronously from a click. */
export function requestGeocoderAccess(): Promise<boolean> {
  if (!isExtensionContext()) return Promise.resolve(false)
  return chrome.permissions.request({ origins: [`${GEOCODER}/*`] }).catch(() => false)
}
