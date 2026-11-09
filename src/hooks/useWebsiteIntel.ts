import { useCallback, useEffect, useState } from 'react'
import { websiteIntelService } from '../services/websiteIntelService'
import type { MarketingAnalysis } from '../types/analysis'
import type { WebsiteIntel } from '../types/intel'
import { useAnalysis } from './analysisContextValue'

export interface WebsiteIntelState {
  intel: WebsiteIntel | null
  loading: boolean
  disabled: boolean
  pageSpeedRunning: boolean
  refresh(): void
  runPageSpeed(): void
}

/** Loads domain/hosting/archive intel for an analysis (cached for 7 days). */
export function useWebsiteIntel(analysis: MarketingAnalysis): WebsiteIntelState {
  const { settings, ready } = useAnalysis()
  const [nonce, setNonce] = useState(0)
  const [result, setResult] = useState<{ key: string; intel: WebsiteIntel | null }>({ key: '', intel: null })
  const [pageSpeedRunning, setPageSpeedRunning] = useState(false)
  const disabled = !settings.onlineLookups
  const key = `${analysis.id}:${disabled}:${nonce}`

  useEffect(() => {
    if (!ready) return
    let cancelled = false
    const request = disabled
      ? websiteIntelService.cached(new URL(analysis.page.url).hostname) // lookups off: cached only
      : websiteIntelService.get(analysis, { force: nonce > 0 })
    void request.then((intel) => !cancelled && setResult({ key, intel }))
    return () => {
      cancelled = true
    }
  }, [analysis, disabled, ready, nonce, key])

  // While refreshing, keep showing the previous intel for the same analysis.
  const intel = result.key.startsWith(`${analysis.id}:`) ? result.intel : null
  const loading = result.key !== key

  const refresh = useCallback(() => setNonce((n) => n + 1), [])

  const runPageSpeed = useCallback(() => {
    if (!intel) return
    setPageSpeedRunning(true)
    void websiteIntelService
      .runPageSpeed(analysis, intel, settings.pageSpeedApiKey)
      .then((next) => setResult((prev) => ({ ...prev, intel: next })))
      .finally(() => setPageSpeedRunning(false))
  }, [analysis, intel, settings.pageSpeedApiKey])

  return { intel, loading, disabled, pageSpeedRunning, refresh, runPageSpeed }
}
