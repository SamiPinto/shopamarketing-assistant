import { useMemo, useState } from 'react'
import { Copy, FileText, Target } from 'lucide-react'
import { useClipboard } from '../../hooks/useClipboard'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { strategyService } from '../../services/strategyService'
import type { MarketingStrategy } from '../../types/misc'
import { Button } from '../ui/Button'
import { EmptyState, Notice } from '../ui/Primitives'

function strategyToText(name: string, s: MarketingStrategy): string {
  return [
    `MARKETING STRATEGY — ${name}`,
    '',
    'CURRENT SITUATION',
    ...s.currentSituation,
    '',
    'POTENTIAL OPPORTUNITIES',
    ...s.opportunities.map((o) => `- ${o.title}: ${o.detail}`),
    '',
    'RECOMMENDED FOR INVESTIGATION',
    ...s.investigations.map((i) => `- ${i}`),
    '',
    'POTENTIAL CHANNELS',
    ...s.channels.map((c) => `- ${c.label}: ${c.rationale}`),
    '',
    '90-DAY PLANNING TEMPLATE',
    ...s.plan.flatMap((p) => [`${p.window} — ${p.focus}`, ...p.actions.map((a) => `  - ${a}`)]),
    '',
    ...s.caveats,
  ].join('\n')
}

export default function StrategyModule({ analysis, navigate }: ModuleProps) {
  const [built, setBuilt] = useState(false)
  const strategy = useMemo(() => strategyService.build(analysis), [analysis])
  const { copy, copied } = useClipboard()

  return (
    <div className="module">
      <header className="module-header">
        <div className="module-header__title-row">
          <span className="module-header__icon">
            <Target size={18} aria-hidden="true" />
          </span>
          <h1 className="module-header__title">Build Marketing Strategy</h1>
        </div>
        <p className="module-header__description">
          Combines the detected opportunity signals into a starting strategy for discussion. Language is deliberately
          tentative: potential opportunities, recommended for investigation, could be considered.
        </p>
      </header>

      {!built ? (
        <section className="panel">
          <EmptyState
            icon={Target}
            title="Ready to build a strategy draft"
            action={
              <Button variant="primary" icon={Target} onClick={() => setBuilt(true)}>
                Build Marketing Strategy
              </Button>
            }
          >
            Uses {analysis.opportunities.length} opportunity statements and {analysis.services.length} potential
            service fits from this analysis.
          </EmptyState>
        </section>
      ) : (
        <>
          <div className="button-row">
            <Button icon={Copy} onClick={() => void copy('strategy', strategyToText(analysis.business.name, strategy))}>
              {copied === 'strategy' ? 'Copied' : 'Copy Strategy'}
            </Button>
            <Button icon={FileText} onClick={() => navigate('report')}>
              Generate Report
            </Button>
          </div>

          <div className="strategy">
            <section className="strategy__section">
              <h2 className="strategy__heading">
                <span>01</span> Current situation
              </h2>
              {strategy.currentSituation.map((p) => (
                <p key={p}>{p}</p>
              ))}
            </section>

            <section className="strategy__section">
              <h2 className="strategy__heading">
                <span>02</span> Potential opportunities
              </h2>
              <ul className="strategy__list">
                {strategy.opportunities.map((o) => (
                  <li key={o.title}>
                    <strong>{o.title}</strong> <span className="muted-text">· {o.category}</span>
                    <br />
                    {o.detail}
                  </li>
                ))}
              </ul>
            </section>

            <section className="strategy__section">
              <h2 className="strategy__heading">
                <span>03</span> Recommended for investigation
              </h2>
              <ul className="strategy__list">
                {strategy.investigations.map((i) => (
                  <li key={i}>{i}</li>
                ))}
              </ul>
            </section>

            <section className="strategy__section">
              <h2 className="strategy__heading">
                <span>04</span> Potential channels
              </h2>
              {strategy.channels.length ? (
                <ul className="strategy__channels">
                  {strategy.channels.map((c) => (
                    <li key={c.service}>
                      <span className="strategy__channel-name">{c.label}</span>
                      <span>{c.rationale}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="muted-text">No channel showed a clear potential fit from this page.</p>
              )}
            </section>

            <section className="strategy__section">
              <h2 className="strategy__heading">
                <span>05</span> 90-day planning template
              </h2>
              <ol className="timeline">
                {strategy.plan.map((phase) => (
                  <li key={phase.window} className="timeline__phase">
                    <p className="timeline__window">{phase.window}</p>
                    <p className="timeline__focus">{phase.focus}</p>
                    <ul>
                      {phase.actions.map((a) => (
                        <li key={a}>{a}</li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </section>

            <Notice tone="neutral">{strategy.caveats.join(' ')}</Notice>
          </div>
        </>
      )}
    </div>
  )
}
