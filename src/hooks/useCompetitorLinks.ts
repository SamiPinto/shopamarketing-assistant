import { useCallback, useEffect, useMemo, useState } from 'react'
import { storageService } from '../services/storageService'
import type { MarketingAnalysis } from '../types/analysis'
import { useAnalysis } from './analysisContextValue'

/**
 * Competitor sites the salesperson has analysed and linked to this prospect.
 * Real data: each competitor is a full analysis of a site they visited.
 */
export function useCompetitorLinks(analysis: MarketingAnalysis) {
  const { recent } = useAnalysis()
  const [ids, setIds] = useState<string[]>([])

  useEffect(() => {
    let cancelled = false
    void storageService.getCompetitorLinks(analysis.id).then((stored) => !cancelled && setIds(stored))
    return () => {
      cancelled = true
    }
  }, [analysis.id])

  const candidates = useMemo(
    () => recent.filter((a) => a.id !== analysis.id && a.business.domain !== analysis.business.domain),
    [recent, analysis.id, analysis.business.domain],
  )
  const linked = useMemo(() => candidates.filter((a) => ids.includes(a.id)), [candidates, ids])

  const toggle = useCallback(
    (id: string) => {
      setIds((prev) => {
        const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id].slice(-4)
        void storageService.saveCompetitorLinks(analysis.id, next)
        return next
      })
    },
    [analysis.id],
  )

  return { candidates, linked, ids, toggle }
}
