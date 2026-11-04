import { CircleHelp, Compass, Lightbulb } from 'lucide-react'
import type { Insight } from '../../types/analysis'

interface Props {
  insight: Insight
  compact?: boolean
}

export function InsightPanel({ insight, compact }: Props) {
  return (
    <section className={`insight${compact ? ' insight--compact' : ''}`} aria-labelledby="insight-title">
      <header className="insight__header">
        <p className="insight__kicker">
          <span className="insight__dot" aria-hidden="true" />
          Shopa Insight
        </p>
        <p className="insight__provider">
          {insight.provider === 'template' ? 'Rule-based analysis · no AI model used' : 'Generated with an AI model'}
        </p>
      </header>
      <h3 id="insight-title" className="insight__headline">
        {insight.headline}
      </h3>
      <div className="insight__summary">
        {insight.summary.map((p) => (
          <p key={p}>{p}</p>
        ))}
      </div>
      {!compact && (
        <div className="insight__columns">
          <InsightColumn icon={Lightbulb} title="Why this matters" items={insight.whyItMatters} empty="No major gaps identified." />
          <InsightColumn icon={Compass} title="What Shopa could investigate" items={insight.investigate} empty="No specific investigations suggested." />
          <InsightColumn icon={CircleHelp} title="Information still missing" items={insight.missingInformation} empty="—" />
        </div>
      )}
    </section>
  )
}

function InsightColumn({ icon: Icon, title, items, empty }: { icon: typeof Lightbulb; title: string; items: string[]; empty: string }) {
  return (
    <div className="insight__column">
      <h4>
        <Icon size={14} aria-hidden="true" />
        {title}
      </h4>
      {items.length ? (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : (
        <p>{empty}</p>
      )}
    </div>
  )
}
