import {
  CircleCheck,
  CircleDashed,
  CircleHelp,
  FlaskConical,
  Lightbulb,
  Radar,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import type { CategoryStatus, Certainty, CheckStatus } from '../../types/analysis'

export type Tone = 'good' | 'attention' | 'absent' | 'info' | 'detected' | 'accent'

export interface StatusMeta {
  label: string
  icon: LucideIcon
  tone: Tone
}

export const CHECK_META: Record<CheckStatus, StatusMeta> = {
  good: { label: 'Good', icon: CircleCheck, tone: 'good' },
  attention: { label: 'Needs attention', icon: TriangleAlert, tone: 'attention' },
  'not-detected': { label: 'Not detected', icon: CircleDashed, tone: 'absent' },
  unknown: { label: 'Unknown', icon: CircleHelp, tone: 'info' },
}

export const CATEGORY_META: Record<CategoryStatus, StatusMeta> = {
  good: { label: 'Good', icon: CircleCheck, tone: 'good' },
  attention: { label: 'Attention', icon: TriangleAlert, tone: 'attention' },
  detected: { label: 'Detected', icon: Radar, tone: 'detected' },
  limited: { label: 'Limited signals', icon: CircleDashed, tone: 'absent' },
  research: { label: 'Research needed', icon: FlaskConical, tone: 'info' },
}

export const CERTAINTY_META: Record<Certainty, StatusMeta> = {
  detected: { label: 'Detected', icon: Radar, tone: 'detected' },
  potential: { label: 'Potential', icon: Lightbulb, tone: 'accent' },
  research: { label: 'Requires research', icon: FlaskConical, tone: 'info' },
}
