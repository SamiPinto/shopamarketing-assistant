import { ExternalLink } from 'lucide-react'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { SOCIAL_LABELS, SOCIAL_PLATFORMS } from '../../utils/signals'
import { CategoryDetail } from '../overview/CategoryDetail'
import { Notice } from '../ui/Primitives'
import { PlatformMark } from '../ui/PlatformMark'
import { StatusBadge } from '../ui/StatusBadge'

export default function SocialModule({ analysis }: ModuleProps) {
  const { page } = analysis
  return (
    <CategoryDetail
      analysis={analysis}
      id="social"
      checksTitle="Platform links"
      description="Social profiles linked from the analysed page. A missing link means “not detected on this page” — not that no account exists."
    >
      <section className="panel" aria-labelledby="platforms">
        <h2 id="platforms" className="panel__title">
          Social presence
        </h2>
        <ul className="platform-grid">
          {SOCIAL_PLATFORMS.map((platform) => {
            const link = page.socialLinks.find((s) => s.platform === platform)
            return (
              <li key={platform} className={`platform${link ? ' platform--on' : ''}`}>
                <PlatformMark platform={platform} active={Boolean(link)} />
                <div className="platform__body">
                  <p className="platform__name">{SOCIAL_LABELS[platform]}</p>
                  {link ? (
                    analysis.source === 'demo' ? (
                      <p className="platform__url mono">{link.url.replace(/^https?:\/\//, '')}</p>
                    ) : (
                      <a className="platform__url mono link" href={link.url} target="_blank" rel="noreferrer noopener">
                        {link.url.replace(/^https?:\/\/(www\.)?/, '')}
                        <ExternalLink size={11} aria-hidden="true" />
                      </a>
                    )
                  ) : (
                    <p className="platform__url">Not detected on this page</p>
                  )}
                </div>
                <div className="platform__status">
                  <StatusBadge kind="check" status={link ? 'good' : 'not-detected'} label={link ? 'Detected' : 'Not detected'} compact />
                  <StatusBadge kind="check" status="unknown" label="Activity unknown" compact />
                </div>
              </li>
            )
          })}
        </ul>
        <Notice tone="info">
          Follower counts, posting frequency and engagement are unknown. They require platform APIs or manual review
          (planned integration).
        </Notice>
      </section>
    </CategoryDetail>
  )
}
