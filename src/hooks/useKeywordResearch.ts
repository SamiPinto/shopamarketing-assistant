import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { detectRegion } from '../services/analysis/business'
import { geocode, requestGeocoderAccess } from '../services/competitorLocationService'
import { DATAFORSEO_ENABLED, checkRankingsWithDataForSeo, searchVolumes } from '../services/dataForSeoService'
import { checkRankings, requestGoogleAccess } from '../services/googleSerpService'
import {
  DEFAULT_PLACES,
  DEFAULT_SELECTED,
  MAX_PLACES,
  MAX_SEARCHES,
  MAX_SELECTED,
  detectedCountry,
  keywordStore,
  marketChoice,
  normaliseKeyword,
  queryFor,
  reportDomain,
  reportPlaces,
  serviceOf,
  suggestFromAutocomplete,
  suggestFromSite,
  suggestPlaces,
  type MarketChoice,
} from '../services/keywordService'
import type { MarketingAnalysis } from '../types/analysis'
import type { KeywordCandidate, KeywordProgress, KeywordRanking, KeywordReport, KeywordVolume, SearchPlace } from '../types/keywords'
import { isExtensionContext } from '../utils/chrome'
import { useAnalysis } from './analysisContextValue'

export interface KeywordResearchState {
  available: boolean
  /** Searches run through DataForSEO (paid, with search volumes) instead of a Google tab. */
  paid: boolean
  disabled: boolean
  /** Service keywords ("blocked drains"). */
  candidates: KeywordCandidate[]
  selected: string[]
  /** Suburbs, cities and postcodes ("Parramatta", "2150"). */
  places: SearchPlace[]
  selectedPlaces: string[]
  /** selected services × selected places. */
  searchCount: number
  report: KeywordReport | null
  running: boolean
  progress: KeywordProgress | null
  suggesting: boolean
  error: string | null
  maxPages: number
  setMaxPages(pages: number): void
  /** Which Google is searched; defaults to the business's detected country. */
  market: MarketChoice
  setMarket(code: string): void
  country: MarketingAnalysis['business']['country']
  toggle(keyword: string): void
  addKeyword(input: string): void
  togglePlace(label: string): void
  addPlace(input: string): void
  /** Both must be called directly from a click: they may prompt for Google access. */
  findMoreIdeas(): void
  check(): void
  stop(): void
}

const sameLabel = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

export function useKeywordResearch(analysis: MarketingAnalysis): KeywordResearchState {
  const { settings, ready } = useAnalysis()
  const domain = reportDomain(analysis)
  const siteIdeas = useMemo(() => suggestFromSite(analysis), [analysis])
  const sitePlaces = useMemo(() => suggestPlaces(analysis), [analysis])
  const [extra, setExtra] = useState<KeywordCandidate[]>([])
  const [selected, setSelected] = useState<string[]>([])
  const [extraPlaces, setExtraPlaces] = useState<SearchPlace[]>([])
  const [selectedPlaces, setSelectedPlaces] = useState<string[]>([])
  const [report, setReport] = useState<KeywordReport | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<KeywordProgress | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [maxPages, setMaxPages] = useState(2)
  const country = useMemo(() => detectedCountry(analysis), [analysis])
  const [marketCode, setMarketCode] = useState<string | null>(null)
  const market = marketChoice(marketCode ?? country?.code ?? 'WW')
  const abort = useRef<AbortController | null>(null)

  // Load the last check for this site and restore its services and places; else use the site's own.
  useEffect(() => {
    if (!ready) return
    let cancelled = false
    void keywordStore.get(domain).then((saved) => {
      if (cancelled) return
      setError(null)
      setReport(saved)
      // Reports saved before country support were all searched on google.com.au.
      setMarketCode(saved ? (saved.marketCode ?? 'AU') : null)
      if (saved) {
        const services = [...new Set(saved.keywords.map(serviceOf))]
        const known = new Set(siteIdeas.map((c) => c.keyword))
        setExtra(
          services
            .filter((s) => !known.has(s))
            .map((s) => ({
              keyword: s,
              source: saved.keywords.find((k) => serviceOf(k) === s)?.source ?? 'manual',
              basis: 'Checked previously',
            })),
        )
        setSelected(services)
        const places = reportPlaces(saved)
        setExtraPlaces(
          places
            .filter((p) => !sitePlaces.some((s) => sameLabel(s.label, p)))
            .map((p) => ({ label: p, kind: 'custom', basis: 'Checked previously' })),
        )
        setSelectedPlaces(places)
      } else {
        setExtra([])
        setExtraPlaces([])
        setSelected(siteIdeas.slice(0, DEFAULT_SELECTED).map((c) => c.keyword))
        // Different areas first (Chermside, Indooroopilly), then a pincode when there's only one area.
        const ordered = [...sitePlaces.filter((p) => p.kind === 'city'), ...sitePlaces.filter((p) => p.kind !== 'city')]
        setSelectedPlaces(ordered.slice(0, DEFAULT_PLACES).map((p) => p.label))
      }
    })
    return () => {
      cancelled = true
      abort.current?.abort()
    }
  }, [domain, ready, siteIdeas, sitePlaces])

  const candidates = useMemo(() => [...siteIdeas, ...extra], [siteIdeas, extra])
  const places = useMemo(() => [...sitePlaces, ...extraPlaces], [sitePlaces, extraPlaces])
  const searchCount = selected.length * Math.max(1, selectedPlaces.length)

  const toggle = useCallback((keyword: string) => {
    setSelected((prev) =>
      prev.includes(keyword) ? prev.filter((k) => k !== keyword) : prev.length >= MAX_SELECTED ? prev : [...prev, keyword],
    )
  }, [])

  const addKeyword = useCallback(
    (input: string) => {
      const keyword = normaliseKeyword(input)
      if (!keyword) return
      if (!candidates.some((c) => c.keyword === keyword)) {
        setExtra((prev) => [...prev, { keyword, source: 'manual', basis: 'Added by you' }])
      }
      setSelected((prev) => (prev.includes(keyword) || prev.length >= MAX_SELECTED ? prev : [...prev, keyword]))
    },
    [candidates],
  )

  const togglePlace = useCallback((label: string) => {
    setSelectedPlaces((prev) =>
      prev.includes(label) ? prev.filter((p) => p !== label) : prev.length >= MAX_PLACES ? prev : [...prev, label],
    )
  }, [])

  const addPlace = useCallback(
    (input: string) => {
      const label = input.replace(/\s+/g, ' ').trim()
      if (!label) return
      const existing = places.find((p) => sameLabel(p.label, label))
      if (!existing) {
        const kind = /\d/.test(label) ? 'postcode' : 'custom'
        setExtraPlaces((prev) => [...prev, { label, kind, basis: 'Added by you' }])
      }
      const value = existing?.label ?? label
      setSelectedPlaces((prev) => (prev.includes(value) || prev.length >= MAX_PLACES ? prev : [...prev, value]))
    },
    [places],
  )

  const findMoreIdeas = useCallback(() => {
    const access = requestGoogleAccess(market)
    setSuggesting(true)
    setError(null)
    void (async () => {
      try {
        if (!(await access)) {
          setError('Google access was not granted, so Autocomplete ideas could not be loaded.')
          return
        }
        const found = await suggestFromAutocomplete(analysis, candidates, market, selectedPlaces[0] ?? null)
        if (found.length === 0) setError('Google Autocomplete had no further ideas for this site.')
        setExtra((prev) => [...prev, ...found])
      } finally {
        setSuggesting(false)
      }
    })()
  }, [analysis, candidates, market, selectedPlaces])

  const check = useCallback(() => {
    if (running || selected.length === 0 || searchCount > MAX_SEARCHES) return
    // DataForSEO only needs the map lookup (to search from each place); the free method needs Google.
    const access = DATAFORSEO_ENABLED ? requestGeocoderAccess() : requestGoogleAccess(market)
    const controller = new AbortController()
    abort.current = controller
    const sourceOf = new Map(candidates.map((c) => [c.keyword, c.source]))
    const placeList: (string | null)[] = selectedPlaces.length ? selectedPlaces : [null]
    // Place by place, so a run stopped early still has whole columns.
    const searches = placeList.flatMap((place) =>
      selected.map((service) => ({
        keyword: queryFor(service, place),
        service,
        place,
        source: sourceOf.get(service) ?? 'manual',
      })),
    )
    // Earlier results only carry over when they were searched in the same country.
    const previous = report && (report.marketCode ?? 'AU') === market.code ? report : null
    const checked: KeywordRanking[] = []
    let volumes: Record<string, KeywordVolume> | undefined
    let cost = 0

    setRunning(true)
    setError(null)
    setProgress({ done: 0, total: searches.length, keyword: searches[0]!.keyword, page: 1 })

    const build = (stoppedReason: string | null): KeywordReport => {
      const done = new Set(checked.map((k) => k.keyword))
      const wanted = new Set(searches.map((s) => s.keyword))
      // If the run stopped early, keep earlier results for searches it didn't reach.
      const carried = stoppedReason
        ? (previous?.keywords ?? []).filter((k) => wanted.has(k.keyword) && !done.has(k.keyword))
        : []
      return {
        domain,
        checkedAt: new Date().toISOString(),
        market: market.googleHost,
        marketCode: market.code,
        places: selectedPlaces,
        provider: DATAFORSEO_ENABLED ? 'dataforseo' : 'google',
        ...(volumes ? { volumes } : {}),
        ...(DATAFORSEO_ENABLED ? { cost } : {}),
        keywords: [...checked, ...carried],
        stoppedReason,
      }
    }

    // DataForSEO: search from each place's map position, and fetch search volumes alongside.
    const runPaid = async (geocoderAllowed: boolean) => {
      const region = detectRegion(analysis.page)
      const where = (place: string | null) =>
        place && geocoderAllowed ? geocode([place, region, country?.name].filter(Boolean).join(' ')) : Promise.resolve(null)
      const points = new Map(await Promise.all(placeList.map(async (p) => [p, await where(p)] as const)))
      const volumeRun = searchVolumes([...searches.map((s) => s.keyword), ...selected], market.code)
        .then((found) => {
          volumes = found.volumes
          cost += found.cost
        })
        .catch((e: unknown) => setError(`Search volumes could not be loaded: ${e instanceof Error ? e.message : 'unknown error'}`))
      try {
        cost += await checkRankingsWithDataForSeo({
          domain,
          marketCode: market.code,
          searches: searches.map((s) => ({ ...s, point: points.get(s.place) ?? null })),
          maxPages,
          signal: controller.signal,
          onProgress: setProgress,
          onKeyword: (ranking) => {
            checked.push(ranking)
            setReport(build('Checking…'))
          },
        })
      } finally {
        await volumeRun
      }
      const next = build(controller.signal.aborted ? 'Stopped before all keywords were checked.' : null)
      setReport(next)
      await keywordStore.save(next)
    }

    void (async () => {
      try {
        const granted = await access
        if (DATAFORSEO_ENABLED) {
          await runPaid(granted)
          return
        }
        if (!granted) {
          setError('Google access was not granted. Chrome needs it to read the search results.')
          return
        }
        const stoppedReason = await checkRankings({
          domain,
          market,
          keywords: searches,
          maxPages,
          signal: controller.signal,
          onProgress: setProgress,
          onCaptcha: (captcha) => setProgress((p) => (p ? { ...p, captcha } : p)),
          onKeyword: (ranking) => {
            checked.push(ranking)
            setReport(build('Checking…'))
          },
        })
        const next = build(stoppedReason)
        setReport(next)
        await keywordStore.save(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The ranking check failed.')
        if (checked.length) {
          const next = build('The check stopped with an error.')
          setReport(next)
          await keywordStore.save(next)
        }
      } finally {
        setRunning(false)
        setProgress(null)
        abort.current = null
      }
    })()
  }, [running, selected, selectedPlaces, searchCount, candidates, report, domain, maxPages, market, analysis, country])

  const stop = useCallback(() => abort.current?.abort(), [])

  return {
    available: isExtensionContext(),
    paid: DATAFORSEO_ENABLED,
    disabled: !settings.onlineLookups,
    candidates,
    selected,
    places,
    selectedPlaces,
    searchCount,
    report,
    running,
    progress,
    suggesting,
    error,
    maxPages,
    setMaxPages,
    market,
    setMarket: setMarketCode,
    country,
    toggle,
    addKeyword,
    togglePlace,
    addPlace,
    findMoreIdeas,
    check,
    stop,
  }
}
