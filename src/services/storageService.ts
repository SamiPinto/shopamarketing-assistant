import type { MarketingAnalysis } from '../types/analysis'
import type { WebsiteIntel } from '../types/intel'
import { SCORING_VERSION } from './analysis/version'
import type { OOHBriefInput } from '../types/ooh'
import { DEFAULT_SETTINGS, type Settings } from '../types/misc'
import { isExtensionContext } from '../utils/chrome'

/**
 * Persistence abstraction. V1 stores everything in chrome.storage.local (or
 * localStorage when running the UI under `npm run dev`). A backend adapter
 * (e.g. FastAPI + Supabase) can implement the same interface later.
 */
export interface KeyValueStore {
  get<T>(key: string): Promise<T | undefined>
  set<T>(key: string, value: T): Promise<void>
  remove(key: string): Promise<void>
}

const chromeStore: KeyValueStore = {
  async get<T>(key: string) {
    const result = await chrome.storage.local.get(key)
    return result[key] as T | undefined
  },
  async set(key, value) {
    await chrome.storage.local.set({ [key]: value })
  },
  async remove(key) {
    await chrome.storage.local.remove(key)
  },
}

const PREFIX = 'shopa:'
const browserStore: KeyValueStore = {
  async get<T>(key: string) {
    try {
      const raw = localStorage.getItem(PREFIX + key)
      return raw ? (JSON.parse(raw) as T) : undefined
    } catch {
      return undefined
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value))
    } catch {
      // Storage may be unavailable (private mode); the UI still works in-memory.
    }
  },
  async remove(key) {
    try {
      localStorage.removeItem(PREFIX + key)
    } catch {
      // ignore
    }
  },
}

const store: KeyValueStore = isExtensionContext() ? chromeStore : browserStore

const KEYS = {
  settings: 'settings',
  recent: 'recentAnalyses',
  lastId: 'lastAnalysisId',
  briefs: 'oohBriefDrafts',
  intel: 'websiteIntel',
  competitors: 'competitorLinks',
} as const

const MAX_RECENT = 8

export const storageService = {
  async getSettings(): Promise<Settings> {
    return { ...DEFAULT_SETTINGS, ...((await store.get<Partial<Settings>>(KEYS.settings)) ?? {}) }
  },

  async saveSettings(settings: Settings): Promise<void> {
    await store.set(KEYS.settings, settings)
  },

  async getRecentAnalyses(): Promise<MarketingAnalysis[]> {
    // Analyses produced by older scoring rules lack newer fields; drop them.
    const all = (await store.get<MarketingAnalysis[]>(KEYS.recent)) ?? []
    return all.filter((a) => a.scoringVersion === SCORING_VERSION)
  },

  /** Saves an analysis as the most recent, replacing older runs of the same URL. */
  async saveAnalysis(analysis: MarketingAnalysis): Promise<MarketingAnalysis[]> {
    const existing = await this.getRecentAnalyses()
    const next = [analysis, ...existing.filter((a) => a.page.url !== analysis.page.url && a.id !== analysis.id)].slice(
      0,
      MAX_RECENT,
    )
    await store.set(KEYS.recent, next)
    await store.set(KEYS.lastId, analysis.id)
    return next
  },

  async removeAnalysis(id: string): Promise<MarketingAnalysis[]> {
    const next = (await this.getRecentAnalyses()).filter((a) => a.id !== id)
    await store.set(KEYS.recent, next)
    return next
  },

  async clearAnalyses(): Promise<void> {
    await store.remove(KEYS.recent)
    await store.remove(KEYS.lastId)
  },

  async getLastAnalysis(): Promise<MarketingAnalysis | null> {
    const [id, recent] = await Promise.all([store.get<string>(KEYS.lastId), this.getRecentAnalyses()])
    return recent.find((a) => a.id === id) ?? null
  },

  async setLastAnalysisId(id: string): Promise<void> {
    await store.set(KEYS.lastId, id)
  },

  async getIntel(domain: string): Promise<WebsiteIntel | null> {
    const map = (await store.get<Record<string, WebsiteIntel>>(KEYS.intel)) ?? {}
    return map[domain] ?? null
  },

  async saveIntel(intel: WebsiteIntel): Promise<void> {
    const map = (await store.get<Record<string, WebsiteIntel>>(KEYS.intel)) ?? {}
    const entries = Object.entries({ ...map, [intel.domain]: intel }).slice(-40)
    await store.set(KEYS.intel, Object.fromEntries(entries))
  },

  /** Competitor analyses a salesperson linked to an analysis (by analysis id). */
  async getCompetitorLinks(analysisId: string): Promise<string[]> {
    const map = (await store.get<Record<string, string[]>>(KEYS.competitors)) ?? {}
    return map[analysisId] ?? []
  },

  async saveCompetitorLinks(analysisId: string, ids: string[]): Promise<void> {
    const map = (await store.get<Record<string, string[]>>(KEYS.competitors)) ?? {}
    const entries = Object.entries({ ...map, [analysisId]: ids }).slice(-40)
    await store.set(KEYS.competitors, Object.fromEntries(entries))
  },

  async getBriefDraft(analysisId: string): Promise<OOHBriefInput | null> {
    const drafts = (await store.get<Record<string, OOHBriefInput>>(KEYS.briefs)) ?? {}
    return drafts[analysisId] ?? null
  },

  async saveBriefDraft(analysisId: string, input: OOHBriefInput): Promise<void> {
    const drafts = (await store.get<Record<string, OOHBriefInput>>(KEYS.briefs)) ?? {}
    // Keep the drafts map bounded.
    const entries = Object.entries({ ...drafts, [analysisId]: input }).slice(-20)
    await store.set(KEYS.briefs, Object.fromEntries(entries))
  },
}
