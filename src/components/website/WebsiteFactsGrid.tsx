import { CircleCheck, Loader2, TriangleAlert } from 'lucide-react'
import type { WebsiteFact } from '../../services/websiteFacts'

/** Grid of website facts with tone shown by icon + colour (never colour alone). */
export function WebsiteFactsGrid({ facts, compact }: { facts: WebsiteFact[]; compact?: boolean }) {
  return (
    <dl className={`facts${compact ? ' facts--compact' : ''}`}>
      {facts.map((f) => (
        <div key={f.id} className={`fact fact--${f.tone}`}>
          <dt className="fact__label">{f.label}</dt>
          <dd className="fact__value">
            {f.tone === 'good' && <CircleCheck size={13} aria-label="Good" />}
            {f.tone === 'attention' && <TriangleAlert size={13} aria-label="Needs attention" />}
            {f.tone === 'pending' && <Loader2 size={13} className="spin" aria-hidden="true" />}
            <span>{f.value}</span>
          </dd>
          {f.detail && <dd className="fact__detail">{f.detail}</dd>}
        </div>
      ))}
    </dl>
  )
}
