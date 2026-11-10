import { useCallback, useEffect, useState } from 'react'
import { DATAFORSEO_ENABLED, rankedKeywords } from '../services/dataForSeoService'
import { storageService } from '../services/storageService'
import type { RankedKeywordsReport } from '../types/keywords'

export interface RankedKeywordsState {
  /** The last lookup for this site in this country, or null. */
  report: RankedKeywordsReport | null
  loading: boolean
  error: string | null
  /** Costs DataForSEO credit, so it only runs on a click. */
  load(): void
}

/** Keywords the site already ranks for (DataForSEO Labs), cached per site. */
export function useRankedKeywords(domain: string, marketCode: string): RankedKeywordsState {
  const [report, setReport] = useState<RankedKeywordsReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!DATAFORSEO_ENABLED) return
    let cancelled = false
    void storageService.getRankedKeywords(domain).then((saved) => {
      if (cancelled) return
      setError(null)
      // A lookup for another country doesn't apply to this one.
      setReport(saved && saved.marketCode === marketCode ? saved : null)
    })
    return () => {
      cancelled = true
    }
  }, [domain, marketCode])

  const load = useCallback(() => {
    if (loading || !DATAFORSEO_ENABLED) return
    setLoading(true)
    setError(null)
    void (async () => {
      try {
        const found = await rankedKeywords(domain, marketCode)
        const next = { ...found, checkedAt: new Date().toISOString() }
        setReport(next)
        await storageService.saveRankedKeywords(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The keywords this site ranks for could not be loaded.')
      } finally {
        setLoading(false)
      }
    })()
  }, [loading, domain, marketCode])

  return { report, loading, error, load }
}
