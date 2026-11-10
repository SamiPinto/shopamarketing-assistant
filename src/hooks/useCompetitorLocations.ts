import { useCallback, useEffect, useMemo, useState } from 'react'
import { detectRegion } from '../services/analysis/business'
import {
  competitorLocationService,
  geocode,
  isLocal,
  localMatch,
  requestSiteAccess,
  type ClientArea,
} from '../services/competitorLocationService'
import { detectedCountry, reportDomain, reportPlaces, suggestPlaces } from '../services/keywordService'
import { storageService } from '../services/storageService'
import type { MarketingAnalysis } from '../types/analysis'
import type { CompetitorLocation, KeywordReport, LocalMatch, SearchCompetitor, SearchPlace } from '../types/keywords'
import { isExtensionContext } from '../utils/chrome'

type Point = { lat: number; lon: number }

export interface CompetitorLocationsState {
  locations: Record<string, CompetitorLocation>
  /** How close a competitor is, with the distance in km when both map positions are known. */
  matchOf(domain: string): { match: LocalMatch; km: number | null }
  /** Competitors without a fresh cached location. */
  pending: string[]
  running: boolean
  error: string | null
  localOnly: boolean
  setLocalOnly(on: boolean): void
  /** Competitors to show: local ones when "local only" is on and addresses have been looked up. */
  visible: SearchCompetitor[]
  /** Must be called directly from a click: it asks Chrome for access to the competitor sites. */
  lookup(): void
}

/** The site's own URL for a competitor domain, as Google listed it. */
function siteUrl(report: KeywordReport, domain: string): string {
  for (const k of report.keywords) {
    const hit = k.results.find((r) => r.domain === domain)
    if (hit) {
      try {
        return new URL(hit.url).origin + '/'
      } catch {
        // fall through to the bare domain
      }
    }
  }
  return `https://${domain}/`
}

export function useCompetitorLocations(
  analysis: MarketingAnalysis,
  report: KeywordReport,
  competitors: SearchCompetitor[],
): CompetitorLocationsState {
  const [locations, setLocations] = useState<Record<string, CompetitorLocation>>({})
  const [clientPoints, setClientPoints] = useState<Record<string, Point>>({})
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [localOnly, setLocalOnly] = useState(true)
  const clientDomain = reportDomain(analysis)
  const domainKey = competitors.map((c) => c.domain).join(',')

  useEffect(() => {
    let cancelled = false
    void Promise.all([
      competitorLocationService.cached(domainKey ? domainKey.split(',') : []),
      storageService.getClientPoints(clientDomain),
    ]).then(([cached, points]) => {
      if (cancelled) return
      setLocations(cached)
      setClientPoints(points)
    })
    return () => {
      cancelled = true
    }
  }, [domainKey, clientDomain])

  // The client's own places: from its site plus any typed in for the ranking check.
  const clientPlaces = useMemo(() => {
    const places: SearchPlace[] = [...suggestPlaces(analysis)]
    for (const label of reportPlaces(report)) {
      if (!places.some((p) => p.label.toLowerCase() === label.toLowerCase())) places.push({ label, kind: 'custom', basis: 'Checked' })
    }
    return places
  }, [analysis, report])
  const region = useMemo(() => detectRegion(analysis.page), [analysis])
  const country = useMemo(() => detectedCountry(analysis), [analysis])
  // One geocoder query per client place, e.g. "Parramatta NSW Australia", "2150 NSW Australia".
  const clientQueries = useMemo(
    () => clientPlaces.slice(0, 6).map((p) => [p.label, region, country?.name].filter(Boolean).join(' ')),
    [clientPlaces, region, country],
  )

  const client = useMemo<ClientArea>(
    () => ({ places: clientPlaces, region, points: clientQueries.flatMap((q) => (clientPoints[q] ? [clientPoints[q]] : [])) }),
    [clientPlaces, region, clientQueries, clientPoints],
  )

  const matchOf = useCallback((domain: string) => localMatch(locations[domain], client), [locations, client])
  const pending = competitors.map((c) => c.domain).filter((d) => !locations[d])
  const looked = competitors.some((c) => locations[c.domain])
  const visible = localOnly && looked ? competitors.filter((c) => isLocal(matchOf(c.domain).match)) : competitors

  const lookup = useCallback(() => {
    if (running || pending.length === 0 || !isExtensionContext()) return
    const access = requestSiteAccess(pending)
    setRunning(true)
    setError(null)
    void (async () => {
      try {
        if (!(await access)) {
          setError('Access to the competitor websites was not granted, so their addresses could not be read.')
          return
        }
        // Where the client is, so competitors can be measured in km from it.
        const missing = clientQueries.filter((q) => !clientPoints[q])
        if (missing.length) {
          const found = await Promise.all(missing.map(async (q) => [q, await geocode(q)] as const))
          const next = { ...clientPoints }
          for (const [q, point] of found) if (point) next[q] = point
          setClientPoints(next)
          await storageService.saveClientPoints(clientDomain, next)
        }
        await competitorLocationService.locateAll(
          pending.map((domain) => ({ domain, url: siteUrl(report, domain) })),
          country,
          (location) => setLocations((prev) => ({ ...prev, [location.domain]: location })),
        )
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Competitor addresses could not be read.')
      } finally {
        setRunning(false)
      }
    })()
  }, [running, pending, clientQueries, clientPoints, clientDomain, report, country])

  return { locations, matchOf, pending, running, error, localOnly, setLocalOnly, visible, lookup }
}
