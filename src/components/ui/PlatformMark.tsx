import type { SocialPlatform } from '../../types/page'
import { SOCIAL_LABELS } from '../../utils/signals'

// Brand icons are intentionally not used; neutral monograms avoid trademark misuse.
const MONOGRAM: Record<SocialPlatform, string> = {
  instagram: 'IG',
  facebook: 'FB',
  linkedin: 'in',
  tiktok: 'TT',
  youtube: 'YT',
  x: 'X',
}

export function PlatformMark({ platform, active }: { platform: SocialPlatform; active: boolean }) {
  return (
    <span className={`platform-mark${active ? ' platform-mark--active' : ''}`} aria-hidden="true" title={SOCIAL_LABELS[platform]}>
      {MONOGRAM[platform]}
    </span>
  )
}
