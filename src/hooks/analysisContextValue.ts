import { createContext, useContext } from 'react'
import type { ActiveTabInfo, AnalysisErrorCode } from '../services/tabService'
import type { MarketingAnalysis } from '../types/analysis'
import type { Settings } from '../types/misc'

export const SCAN_STEPS = [
  'Scanning website',
  'Analysing structure',
  'Checking conversion signals',
  'Identifying social presence',
  'Preparing opportunities',
] as const

export interface RunState {
  phase: 'idle' | 'running' | 'done' | 'error'
  step: number
  error: { code: AnalysisErrorCode; message: string } | null
}

export interface AnalysisContextValue {
  ready: boolean
  settings: Settings
  updateSettings(patch: Partial<Settings>): Promise<void>
  recent: MarketingAnalysis[]
  current: MarketingAnalysis | null
  setCurrent(analysis: MarketingAnalysis | null): void
  activeTab: ActiveTabInfo | null
  run: RunState
  resetRun(): void
  analyseActiveTab(): Promise<MarketingAnalysis | null>
  /** Must be called directly from a user gesture (it may prompt for site access). */
  analyseUrl(input: string): Promise<MarketingAnalysis | null>
  analyseDemo(demoId: string): Promise<MarketingAnalysis | null>
  selectAnalysis(id: string): void
  removeAnalysis(id: string): Promise<void>
}

export const AnalysisContext = createContext<AnalysisContextValue | null>(null)

export function useAnalysis(): AnalysisContextValue {
  const ctx = useContext(AnalysisContext)
  if (!ctx) throw new Error('useAnalysis must be used inside <AnalysisProvider>')
  return ctx
}
