import { useEffect, useState } from 'react'
import { keywordStore, reportDomain } from '../services/keywordService'
import type { MarketingAnalysis } from '../types/analysis'
import type { KeywordReport } from '../types/keywords'

/** The last SEO ranking check for this site, or null when none has been run. */
export function useSavedKeywordReport(analysis: MarketingAnalysis): KeywordReport | null {
  const [report, setReport] = useState<KeywordReport | null>(null)
  const domain = reportDomain(analysis)
  useEffect(() => {
    let cancelled = false
    void keywordStore.get(domain).then((saved) => {
      if (!cancelled) setReport(saved && saved.keywords.length > 0 ? saved : null)
    })
    return () => {
      cancelled = true
    }
  }, [domain])
  return report
}
