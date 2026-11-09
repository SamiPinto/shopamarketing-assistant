/**
 * Website intelligence from free public sources (no API keys):
 * RDAP (domain registrar/dates, IP owner), Google DNS-over-HTTPS (NS/A/MX)
 * and the Internet Archive (first/last capture). PageSpeed needs an optional key.
 */

export type LookupStatus = 'ok' | 'unavailable' | 'error'

export interface DomainIntel {
  status: LookupStatus
  registrableDomain: string
  registrar: string | null
  registeredOn: string | null
  lastChanged: string | null
  expiresOn: string | null
  /** Some registries (e.g. .au) don't publish a registration date. */
  note: string | null
}

export interface HostingIntel {
  status: LookupStatus
  ip: string | null
  /** Network owner from IP RDAP, e.g. "Amazon.com, Inc.". */
  ipOwner: string | null
  hostingProvider: string | null
  /** Set when the IP belongs to a CDN, so the origin host is hidden. */
  cdn: string | null
  nameservers: string[]
  dnsProvider: string | null
  emailProvider: string | null
}

export interface ArchiveIntel {
  status: LookupStatus
  firstSeen: string | null
  lastCaptured: string | null
  historyUrl: string
}

export interface PageSpeedIntel {
  status: 'ok' | 'error' | 'needs-key'
  strategy: 'mobile'
  performanceScore: number | null
  lcpMs: number | null
  cls: number | null
  tbtMs: number | null
  fcpMs: number | null
  fetchedAt: string
  message: string | null
}

export interface WebsiteIntel {
  domain: string
  fetchedAt: string
  domainInfo: DomainIntel
  hosting: HostingIntel
  archive: ArchiveIntel
  pageSpeed: PageSpeedIntel | null
}
