import type { RouteId } from '../pages/dashboardRoutes'
import { CATEGORY_ORDER, type CategoryId } from '../types/analysis'

/**
 * Feature switches. OOH and Competitors are hidden for the current sales
 * rollout; their code stays in place. Set to true (and rebuild) to bring them back.
 */
export const FEATURES = {
  ooh: false,
  competitors: false,
} as const

/**
 * Dashboard screens hidden for the current sales rollout. Their analysis still
 * runs and feeds the reports; only the screen and links to it are hidden.
 * Remove an id (and rebuild) to bring the screen back.
 */
export const HIDDEN_SCREENS: readonly RouteId[] = ['conversion', 'local', 'strategy']

/** Categories shown in the UI and used for opportunities/services/reports. */
export const VISIBLE_CATEGORIES: CategoryId[] = CATEGORY_ORDER.filter((id) => id !== 'ooh' || FEATURES.ooh)
