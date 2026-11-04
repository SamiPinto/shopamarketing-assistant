import {
  CDN_OWNERS,
  DNS_PROVIDERS,
  EMAIL_PROVIDERS,
  HOSTED_PLATFORMS,
  HOSTING_OWNERS,
  matchProvider,
  registrableDomain,
} from '../data/providers'
import type { MarketingAnalysis } from '../types/analysis'
import type { ArchiveIntel, DomainIntel, HostingIntel, PageSpeedIntel, WebsiteIntel } from '../types/intel'
import { storageService } from './storageService'

/**
 * Website intelligence from free, keyless public services:
 *   RDAP (rdap.org)          → registrar, registration/expiry dates, IP network owner
 *   Google DNS-over-HTTPS    → nameservers, A record, MX records
 *   Internet Archive CDX     → first and latest capture ("online since")
 *   Google PageSpeed (opt.)  → Lighthouse mobile score (needs a free API key)
 * Only the domain name is sent. Failures degrade to "unavailable", never to guesses.
 */

const TIMEOUT_MS = 12_000
const CACHE_TTL_MS = 7 * 86_400_000
const RETRY_PARTIAL_MS = 3_600_000

type Json = Record<string, unknown>

async function getJson<T = Json>(url: string, timeoutMs = TIMEOUT_MS): Promise<T> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json, application/rdap+json' } })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    return (await response.json()) as T
  } finally {
    clearTimeout(timer)
  }
}

interface RdapEntity {
  roles?: string[]
  vcardArray?: [string, [string, unknown, string, unknown][]]
  entities?: RdapEntity[]
}

function entityName(entity: RdapEntity): string | null {
  const fn = entity.vcardArray?.[1]?.find((v) => v[0] === 'fn')?.[3]
  return typeof fn === 'string' && fn.trim() ? fn.trim() : null
}

function findEntity(entities: RdapEntity[] | undefined, roles: string[], depth = 0): string | null {
  if (!entities || depth > 2) return null
  for (const role of roles) {
    const match = entities.find((e) => e.roles?.includes(role) && entityName(e))
    if (match) return entityName(match)
  }
  for (const e of entities) {
    const nested = findEntity(e.entities, roles, depth + 1)
    if (nested) return nested
  }
  return null
}

let bootstrap: Promise<[string[], string[]][]> | null = null

/** Registry RDAP base URL for a TLD, from IANA's official bootstrap file. */
async function rdapBaseFor(domain: string): Promise<string | null> {
  bootstrap ??= getJson<{ services: [string[], string[]][] }>('https://data.iana.org/rdap/dns.json').then((d) => d.services)
  const tld = domain.split('.').pop() ?? ''
  try {
    const service = (await bootstrap).find(([tlds]) => tlds.includes(tld))
    return service?.[1][0] ?? null
  } catch {
    bootstrap = null
    return null
  }
}

type RdapDomain = { events?: { eventAction: string; eventDate: string }[]; entities?: RdapEntity[] }

async function fetchRdapDomain(domain: string): Promise<RdapDomain> {
  const base = await rdapBaseFor(domain)
  if (base) {
    try {
      return await getJson<RdapDomain>(`${base.replace(/\/?$/, '/')}domain/${encodeURIComponent(domain)}`)
    } catch {
      // fall through to the rdap.org redirector
    }
  }
  return getJson<RdapDomain>(`https://rdap.org/domain/${encodeURIComponent(domain)}`)
}

async function lookupDomain(domain: string): Promise<DomainIntel> {
  const base: DomainIntel = { status: 'unavailable', registrableDomain: domain, registrar: null, registeredOn: null, lastChanged: null, expiresOn: null, note: null }
  try {
    const data = await fetchRdapDomain(domain)
    const event = (action: string) => data.events?.find((e) => e.eventAction === action)?.eventDate ?? null
    const registeredOn = event('registration')
    return {
      ...base,
      status: 'ok',
      registrar: findEntity(data.entities, ['registrar']),
      registeredOn,
      lastChanged: event('last changed'),
      expiresOn: event('expiration'),
      note:
        !registeredOn && /\.au$/.test(domain)
          ? 'auDA does not publish registration dates for .au domains — see "Online since" from the web archive.'
          : null,
    }
  } catch {
    return base
  }
}

interface DnsAnswer {
  Answer?: { type: number; data: string }[]
}

async function dns(name: string, type: 'A' | 'NS' | 'MX'): Promise<string[]> {
  const data = await getJson<DnsAnswer>(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`)
  const code = { A: 1, NS: 2, MX: 15 }[type]
  return (data.Answer ?? [])
    .filter((a) => a.type === code)
    .map((a) => a.data.replace(/\.$/, '').replace(/^\d+\s+/, '').toLowerCase())
}

async function lookupHosting(host: string, domain: string, platform: string | null): Promise<HostingIntel> {
  const base: HostingIntel = { status: 'unavailable', ip: null, ipOwner: null, hostingProvider: null, cdn: null, nameservers: [], dnsProvider: null, emailProvider: null }
  try {
    const [aRecords, ns, mx] = await Promise.all([
      dns(host, 'A').catch(() => [] as string[]),
      dns(domain, 'NS').catch(() => [] as string[]),
      dns(domain, 'MX').catch(() => [] as string[]),
    ])
    const ip = aRecords.find((r) => /^\d+\.\d+\.\d+\.\d+$/.test(r)) ?? null

    let ipOwner: string | null = null
    let networkName: string | null = null
    if (ip) {
      try {
        // ARIN's RDAP redirects to the right regional registry (APNIC, RIPE, …).
        type RdapIp = { name?: string; entities?: RdapEntity[] }
        const data = await getJson<RdapIp>(`https://rdap.arin.net/registry/ip/${ip}`).catch(() => getJson<RdapIp>(`https://rdap.org/ip/${ip}`))
        networkName = data.name ?? null
        ipOwner = findEntity(data.entities, ['registrant', 'administrative']) ?? networkName
      } catch {
        // IP owner lookup is best-effort
      }
    }

    const ownerText = [networkName, ipOwner].filter(Boolean).join(' ')
    const cdn = matchProvider(CDN_OWNERS, ownerText)
    const hostedPlatform = platform && HOSTED_PLATFORMS.find((p) => platform.startsWith(p))
    const hostingProvider = hostedPlatform
      ? `${hostedPlatform} (platform-hosted)`
      : cdn
        ? null
        : (matchProvider(HOSTING_OWNERS, ownerText) ?? ipOwner)

    return {
      status: ip || ns.length ? 'ok' : 'unavailable',
      ip,
      ipOwner,
      hostingProvider,
      cdn,
      nameservers: ns,
      dnsProvider: matchProvider(DNS_PROVIDERS, ns.join(' ')) ?? (ns[0] ? ns[0].split('.').slice(-2).join('.') : null),
      emailProvider: mx.length ? (matchProvider(EMAIL_PROVIDERS, mx.join(' ')) ?? mx[0].split('.').slice(-2).join('.')) : null,
    }
  } catch {
    return base
  }
}

function archiveTimestamp(ts: string | undefined): string | null {
  if (!ts || ts.length < 8) return null
  return `${ts.slice(0, 4)}-${ts.slice(4, 6)}-${ts.slice(6, 8)}`
}

async function lookupArchive(domain: string): Promise<ArchiveIntel> {
  const historyUrl = `https://web.archive.org/web/*/${domain}`
  const cdx = (limit: number) =>
    getJson<string[][]>(`https://web.archive.org/cdx/search/cdx?url=${encodeURIComponent(domain)}&output=json&fl=timestamp&limit=${limit}`, 15_000)
  try {
    const [first, last] = await Promise.all([cdx(1), cdx(-1).catch(() => [] as string[][])])
    const firstSeen = archiveTimestamp(first[1]?.[0])
    return { status: firstSeen ? 'ok' : 'unavailable', firstSeen, lastCaptured: archiveTimestamp(last[1]?.[0]), historyUrl }
  } catch {
    return { status: 'unavailable', firstSeen: null, lastCaptured: null, historyUrl }
  }
}

interface LighthouseResponse {
  lighthouseResult?: {
    categories?: { performance?: { score?: number } }
    audits?: Record<string, { numericValue?: number }>
  }
  error?: { code?: number; message?: string }
}

async function runPageSpeed(url: string, apiKey: string): Promise<PageSpeedIntel> {
  const base: PageSpeedIntel = { status: 'error', strategy: 'mobile', performanceScore: null, lcpMs: null, cls: null, tbtMs: null, fcpMs: null, fetchedAt: new Date().toISOString(), message: null }
  const params = new URLSearchParams({ url, strategy: 'mobile', category: 'performance' })
  if (apiKey.trim()) params.set('key', apiKey.trim())
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 90_000)
    const response = await fetch(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?${params}`, { signal: controller.signal })
    clearTimeout(timer)
    const data = (await response.json()) as LighthouseResponse
    if (!response.ok) {
      const needsKey = response.status === 429 || response.status === 403
      return { ...base, status: needsKey ? 'needs-key' : 'error', message: needsKey ? 'Google’s free shared quota is used up. Add a free PageSpeed API key in Settings.' : (data.error?.message ?? `HTTP ${response.status}`) }
    }
    const audits = data.lighthouseResult?.audits ?? {}
    const score = data.lighthouseResult?.categories?.performance?.score
    const value = (id: string) => (audits[id]?.numericValue === undefined ? null : Math.round(audits[id].numericValue!))
    return {
      ...base,
      status: 'ok',
      performanceScore: score === undefined ? null : Math.round(score * 100),
      lcpMs: value('largest-contentful-paint'),
      cls: audits['cumulative-layout-shift']?.numericValue === undefined ? null : Math.round(audits['cumulative-layout-shift'].numericValue! * 1000) / 1000,
      tbtMs: value('total-blocking-time'),
      fcpMs: value('first-contentful-paint'),
    }
  } catch (error) {
    return { ...base, message: error instanceof Error && error.name === 'AbortError' ? 'PageSpeed test timed out.' : 'PageSpeed test failed.' }
  }
}

/** Clearly-labelled placeholder intel for fictional demo businesses. */
function demoIntel(analysis: MarketingAnalysis): WebsiteIntel {
  const sinceYear = { 'demo-dental.example': 2014, 'demo-fitness.example': 2019, 'demo-retail.example': 2017 }[analysis.business.domain] ?? 2018
  const domain = analysis.business.domain
  return {
    domain,
    fetchedAt: new Date().toISOString(),
    isDemo: true,
    domainInfo: { status: 'ok', registrableDomain: domain, registrar: 'Example Registrar (demo)', registeredOn: `${sinceYear}-03-02T00:00:00Z`, lastChanged: null, expiresOn: null, note: null },
    hosting: { status: 'ok', ip: null, ipOwner: null, hostingProvider: analysis.website.platform?.startsWith('Wix') ? 'Wix (platform-hosted)' : analysis.website.platform?.startsWith('Shopify') ? 'Shopify (platform-hosted)' : 'Example Shared Hosting (demo)', cdn: null, nameservers: [], dnsProvider: 'Example DNS (demo)', emailProvider: 'Google Workspace (demo)' },
    archive: { status: 'ok', firstSeen: `${sinceYear}-05-11`, lastCaptured: null, historyUrl: '' },
    pageSpeed: null,
  }
}

export const websiteIntelService = {
  async get(analysis: MarketingAnalysis, options: { force?: boolean } = {}): Promise<WebsiteIntel> {
    if (analysis.source === 'demo') return demoIntel(analysis)
    const host = new URL(analysis.page.url).hostname
    const domain = registrableDomain(host)
    const cached = await storageService.getIntel(domain)
    // Partial results (e.g. archive.org briefly down) are retried after an hour.
    const complete = cached?.domainInfo.status === 'ok' && cached.archive.status === 'ok'
    const ttl = complete ? CACHE_TTL_MS : RETRY_PARTIAL_MS
    if (cached && !options.force && Date.now() - Date.parse(cached.fetchedAt) < ttl) return cached

    const [domainInfo, hosting, archive] = await Promise.all([
      lookupDomain(domain),
      lookupHosting(host, domain, analysis.website.platform),
      lookupArchive(domain),
    ])
    const intel: WebsiteIntel = { domain, fetchedAt: new Date().toISOString(), isDemo: false, domainInfo, hosting, archive, pageSpeed: cached?.pageSpeed ?? null }
    await storageService.saveIntel(intel)
    return intel
  },

  async runPageSpeed(analysis: MarketingAnalysis, intel: WebsiteIntel, apiKey: string): Promise<WebsiteIntel> {
    const pageSpeed = await runPageSpeed(analysis.page.url, apiKey)
    const next = { ...intel, pageSpeed }
    if (!intel.isDemo) await storageService.saveIntel(next)
    return next
  },

  cached(domain: string): Promise<WebsiteIntel | null> {
    return storageService.getIntel(registrableDomain(domain))
  },
}
