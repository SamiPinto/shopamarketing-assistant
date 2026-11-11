import { useCallback, useEffect, useRef, useState } from 'react'
import { checkAdLibraries, requestAdLibraryAccess } from '../services/adLibraryService'
import { detectedCountry, reportDomain } from '../services/keywordService'
import { storageService } from '../services/storageService'
import type { AdsProgress, AdsReport } from '../types/ads'
import type { MarketingAnalysis } from '../types/analysis'
import { isExtensionContext } from '../utils/chrome'
import { useAnalysis } from './analysisContextValue'

export interface AdLibrariesState {
  /** The last check for this site, or null. */
  report: AdsReport | null
  available: boolean
  disabled: boolean
  running: boolean
  progress: AdsProgress | null
  error: string | null
  /** Must be called directly from a click: it asks Chrome for access to the ad libraries. */
  check(): void
  stop(): void
}

/** Ads the business is running, counted from the public ad libraries and cached per site. */
export function useAdLibraries(analysis: MarketingAnalysis): AdLibrariesState {
  const { settings } = useAnalysis()
  const domain = reportDomain(analysis)
  const [report, setReport] = useState<AdsReport | null>(null)
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<AdsProgress | null>(null)
  const [error, setError] = useState<string | null>(null)
  const controller = useRef<AbortController | null>(null)

  useEffect(() => {
    let cancelled = false
    void storageService.getAdsReport(domain).then((saved) => {
      if (!cancelled) setReport(saved)
    })
    return () => {
      cancelled = true
    }
  }, [domain])

  const check = useCallback(() => {
    if (running || !isExtensionContext() || !settings.onlineLookups) return
    const access = requestAdLibraryAccess()
    const abort = new AbortController()
    controller.current = abort
    setRunning(true)
    setError(null)
    void (async () => {
      try {
        if (!(await access)) {
          setError('Access to the ad libraries was not granted, so the ads could not be counted.')
          return
        }
        const next = await checkAdLibraries({
          domain,
          businessName: analysis.business.name,
          country: detectedCountry(analysis)?.code ?? null,
          signal: abort.signal,
          onProgress: setProgress,
        })
        if (abort.signal.aborted && next.results.length === 0) return
        setReport(next)
        await storageService.saveAdsReport(next)
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The ad libraries could not be read.')
      } finally {
        setRunning(false)
        setProgress(null)
        controller.current = null
      }
    })()
  }, [running, settings.onlineLookups, domain, analysis])

  const stop = useCallback(() => controller.current?.abort(), [])

  return {
    report,
    available: isExtensionContext(),
    disabled: !settings.onlineLookups,
    running,
    progress,
    error,
    check,
    stop,
  }
}
