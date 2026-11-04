import type { CategoryStatus, Certainty, CheckStatus } from '../../types/analysis'
import { CATEGORY_META, CERTAINTY_META, CHECK_META, type StatusMeta } from './statusMeta'

type BadgeProps =
  | { kind: 'check'; status: CheckStatus; label?: string; compact?: boolean }
  | { kind: 'category'; status: CategoryStatus; label?: string; compact?: boolean }
  | { kind: 'certainty'; status: Certainty; label?: string; compact?: boolean }

function metaFor(props: BadgeProps): StatusMeta {
  switch (props.kind) {
    case 'check':
      return CHECK_META[props.status]
    case 'category':
      return CATEGORY_META[props.status]
    case 'certainty':
      return CERTAINTY_META[props.status]
  }
}

export function StatusBadge(props: BadgeProps) {
  const meta = metaFor(props)
  const Icon = meta.icon
  return (
    <span className={`badge badge--${meta.tone}${props.compact ? ' badge--compact' : ''}`}>
      <Icon size={12} strokeWidth={2.25} aria-hidden="true" />
      <span>{props.label ?? meta.label}</span>
    </span>
  )
}

/** Icon-only status marker with an accessible label (used in dense lists). */
export function StatusIcon({ status }: { status: CheckStatus }) {
  const meta = CHECK_META[status]
  const Icon = meta.icon
  return (
    <span className={`status-icon status-icon--${meta.tone}`} role="img" aria-label={meta.label} title={meta.label}>
      <Icon size={15} strokeWidth={2.25} aria-hidden="true" />
    </span>
  )
}
