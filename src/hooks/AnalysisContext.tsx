import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { analysisService } from '../services/analysisService'
import { storageService } from '../services/storageService'
import { AnalysisError, normaliseInputUrl, tabService, type ActiveTabInfo, type AnalysisErrorCode } from '../services/tabService'
import type { MarketingAnalysis } from '../types/analysis'
import { DEFAULT_SETTINGS, type Settings } from '../types/misc'
import type { PageExtraction } from '../types/page'
import { isExtensionContext } from '../utils/chrome'
import { AnalysisContext, SCAN_STEPS, type AnalysisContextValue, type RunState } from './analysisContextValue'

/** Lets React paint between real pipeline stages — not an artificial delay. */
// rAF never fires in hidden tabs (e.g. a background dashboard), so race it with a short timeout.
const nextFrame = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve())
    setTimeout(resolve, 50)
  })

export function AnalysisProvider({ children, loadLast = false }: { children: ReactNode; loadLast?: boolean }) {
  const [settings, setSettingsState] = useState<Settings>(DEFAULT_SETTINGS)
  const [recent, setRecent] = useState<MarketingAnalysis[]>([])
  const [current, setCurrent] = useState<MarketingAnalysis | null>(null)
  const [activeTab, setActiveTab] = useState<ActiveTabInfo | null>(null)
  const [ready, setReady] = useState(false)
  const [run, setRun] = useState<RunState>({ phase: 'idle', step: 0, error: null })
  const running = useRef(false)
  // Source of truth for synchronous merges, so rapid edits never race each other.
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS)

  const applySettings = useCallback((next: Settings) => {
    settingsRef.current = next
    setSettingsState(next)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function load() {
      const [loadedSettings, loadedRecent, last, tab] = await Promise.all([
        storageService.getSettings(),
        storageService.getRecentAnalyses(),
        loadLast ? storageService.getLastAnalysis() : Promise.resolve(null),
        tabService.getActiveTab().catch(() => null),
      ])
      if (cancelled) return
      applySettings(loadedSettings)
      setRecent(loadedRecent)
      setCurrent(last)
      setActiveTab(tab)
      setReady(true)
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [loadLast, applySettings])

  // Keep popup and dashboard in sync when the other one writes to storage.
  useEffect(() => {
    if (!isExtensionContext()) return
    const listener = (changes: Record<string, chrome.storage.StorageChange>, area: string) => {
      if (area !== 'local') return
      if (changes.recentAnalyses) setRecent((changes.recentAnalyses.newValue as MarketingAnalysis[]) ?? [])
      if (changes.settings) applySettings({ ...DEFAULT_SETTINGS, ...(changes.settings.newValue as Settings) })
      if (changes.lastAnalysisId && loadLast) {
        void storageService.getLastAnalysis().then((last) => last && setCurrent(last))
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [loadLast, applySettings])

  const updateSettings = useCallback(
    async (patch: Partial<Settings>) => {
      const next = { ...settingsRef.current, ...patch }
      applySettings(next)
      await storageService.saveSettings(next)
    },
    [applySettings],
  )

  const runPipeline = useCallback(async (getPage: () => Promise<PageExtraction>) => {
    if (running.current) return null
    running.current = true
    setRun({ phase: 'running', step: 0, error: null })
    try {
      const page = await getPage()
      for (let step = 1; step < SCAN_STEPS.length; step++) {
        setRun({ phase: 'running', step, error: null })
        await nextFrame()
      }
      const analysis = await analysisService.analyse(page)
      setRecent(await storageService.saveAnalysis(analysis))
      setCurrent(analysis)
      setRun({ phase: 'done', step: SCAN_STEPS.length, error: null })
      return analysis
    } catch (error) {
      const code: AnalysisErrorCode = error instanceof AnalysisError ? error.code : 'failed'
      const message = error instanceof Error ? error.message : 'Analysis failed.'
      setRun({ phase: 'error', step: 0, error: { code, message } })
      return null
    } finally {
      running.current = false
    }
  }, [])

  const analyseActiveTab = useCallback(async () => {
    const tab = await tabService.getActiveTab().catch(() => null)
    setActiveTab(tab)
    return runPipeline(async () => {
      if (!tab) {
        throw new AnalysisError(
          isExtensionContext() ? 'no-tab' : 'not-extension',
          isExtensionContext() ? 'No active tab was found.' : 'Live analysis is only available inside the Chrome extension.',
        )
      }
      return tabService.extractPage(tab)
    })
  }, [runPipeline])

  const analyseUrl = useCallback(
    (input: string) => {
      const url = normaliseInputUrl(input)
      // Request site access synchronously so Chrome still sees the user gesture.
      const access =
        url && isExtensionContext()
          ? chrome.permissions.request({ origins: [`${url.origin}/*`] })
          : Promise.resolve(true)
      return runPipeline(async () => {
        if (!isExtensionContext()) {
          throw new AnalysisError('not-extension', 'Live analysis is only available inside the Chrome extension.')
        }
        if (!url) throw new AnalysisError('invalid-url', 'Enter a valid website address.')
        if (!(await access.catch(() => false))) {
          throw new AnalysisError('permission-denied', 'Site access was not granted.')
        }
        return tabService.extractUrl(url.href)
      })
    },
    [runPipeline],
  )


  const selectAnalysis = useCallback(
    (id: string) => {
      const found = recent.find((a) => a.id === id)
      if (!found) return
      setCurrent(found)
      void storageService.setLastAnalysisId(id)
    },
    [recent],
  )

  const removeAnalysis = useCallback(async (id: string) => {
    const next = await storageService.removeAnalysis(id)
    setRecent(next)
    setCurrent((cur) => (cur?.id === id ? (next[0] ?? null) : cur))
  }, [])

  const resetRun = useCallback(() => setRun({ phase: 'idle', step: 0, error: null }), [])

  const value = useMemo<AnalysisContextValue>(
    () => ({
      ready,
      settings,
      updateSettings,
      recent,
      current,
      setCurrent,
      activeTab,
      run,
      resetRun,
      analyseActiveTab,
      analyseUrl,
      selectAnalysis,
      removeAnalysis,
    }),
    [ready, settings, updateSettings, recent, current, activeTab, run, resetRun, analyseActiveTab, analyseUrl, selectAnalysis, removeAnalysis],
  )

  return <AnalysisContext.Provider value={value}>{children}</AnalysisContext.Provider>
}
