import type { CategoryStatus, Check, CheckStatus } from '../../types/analysis'

/**
 * Scoring rules (documented in README "Scoring rules"):
 *  - Each check has a weight. Weight 0 = informational only.
 *  - good = full weight, attention = half weight, not-detected = 0.
 *  - unknown checks are excluded entirely (we cannot score what we cannot see).
 *  - score = earned / possible × 100, rounded.
 */
const STATUS_VALUE: Record<CheckStatus, number | null> = {
  good: 1,
  attention: 0.5,
  'not-detected': 0,
  unknown: null,
}

export function scoreChecks(checks: Check[]): number | null {
  let earned = 0
  let possible = 0
  for (const check of checks) {
    const value = STATUS_VALUE[check.status]
    if (check.weight <= 0 || value === null) continue
    earned += value * check.weight
    possible += check.weight
  }
  return possible === 0 ? null : Math.round((earned / possible) * 100)
}

/** Threshold above which a scored category is considered in good shape. */
export function statusFromScore(score: number | null, goodThreshold: number): CategoryStatus {
  if (score === null) return 'limited'
  return score >= goodThreshold ? 'good' : 'attention'
}

export function makeCheck(
  id: string,
  label: string,
  status: CheckStatus,
  detail: string,
  why: string,
  weight: number,
): Check {
  return { id, label, status, detail, why, weight }
}

export function findCheck(checks: Check[], id: string): Check | undefined {
  return checks.find((c) => c.id === id)
}

export function needsAttention(check: Check | undefined): boolean {
  return check !== undefined && (check.status === 'attention' || check.status === 'not-detected')
}
