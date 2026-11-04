import { useEffect, useState } from 'react'
import { ClipboardList, FlaskConical, Signpost } from 'lucide-react'
import { OOH_ENVIRONMENTS } from '../../data/oohEnvironments'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { oohService } from '../../services/oohService'
import { storageService } from '../../services/storageService'
import type { OOHBrief } from '../../types/ooh'
import { Button } from '../ui/Button'
import { EmptyState, KeyValue, Notice } from '../ui/Primitives'
import { StatusBadge } from '../ui/StatusBadge'
import { BriefDocument } from './BriefDocument'
import { OOHBriefBuilder } from './OOHBriefBuilder'

export default function OOHModule({ analysis }: ModuleProps) {
  const [builderOpen, setBuilderOpen] = useState(false)
  const [brief, setBrief] = useState<OOHBrief | null>(null)
  const category = analysis.categories.ooh
  const suggested = new Set(oohService.suggestEnvironments(analysis.business))
  const research = <span className="muted-text">Requires client input</span>

  // Restore a previously saved brief for this analysis.
  useEffect(() => {
    let cancelled = false
    void storageService.getBriefDraft(analysis.id).then((draft) => {
      if (!cancelled && draft) setBrief(oohService.buildBrief(draft))
    })
    return () => {
      cancelled = true
    }
  }, [analysis.id])

  return (
    <div className="module">
      <header className="module-header">
        <div className="module-header__title-row">
          <span className="module-header__icon">
            <Signpost size={18} aria-hidden="true" />
          </span>
          <h1 className="module-header__title">OOH Opportunity</h1>
          <StatusBadge kind="category" status={category.status} />
        </div>
        <p className="module-header__description">
          Evaluate whether this business or campaign could benefit from out-of-home advertising. OOH is assessed on
          its own terms — it is not assumed to be an add-on to digital services.
        </p>
      </header>

      <section className="summary-band">
        <p className="summary-band__text">{category.summary}</p>
        <Button variant="primary" icon={ClipboardList} onClick={() => setBuilderOpen(true)}>
          {brief ? 'Edit OOH Brief' : 'Build OOH Brief'}
        </Button>
      </section>

      <div className="module-grid">
        <div className="module-grid__main">
          <section className="panel" aria-labelledby="ooh-context">
            <h2 id="ooh-context" className="panel__title">
              Campaign context
            </h2>
            <dl className="kv-grid">
              <KeyValue label="Business location">
                {analysis.business.location?.label ?? <span className="muted-text">Not detected on this page</span>}
              </KeyValue>
              <KeyValue label="Target audience">{brief?.input.audience || research}</KeyValue>
              <KeyValue label="Campaign objective">{brief?.input.objective || research}</KeyValue>
              <KeyValue label="Budget & duration">
                {[brief?.input.budget, brief?.input.duration].filter(Boolean).join(' · ') || research}
              </KeyValue>
            </dl>
          </section>

          <section className="panel" aria-labelledby="ooh-envs">
            <div className="panel__head">
              <h2 id="ooh-envs" className="panel__title">
                Potential OOH environments
              </h2>
              <span className="panel__note">Availability, pricing and reach are not estimated</span>
            </div>
            <ul className="env-grid">
              {OOH_ENVIRONMENTS.map((env) => (
                <li key={env.id} className="env">
                  <div className="env__head">
                    <h3 className="env__name">{env.label}</h3>
                    <span className="env__tag">
                      <FlaskConical size={11} aria-hidden="true" /> Research required
                    </span>
                  </div>
                  <p className="env__desc">{env.description}</p>
                  <p className="env__suits">
                    <span>Often suits</span> {env.oftenSuits}
                  </p>
                  {suggested.has(env.id) && <p className="env__hint">Worth discussing first, given detected context</p>}
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="module-grid__aside">
          <section className="panel" aria-labelledby="ooh-needed">
            <h2 id="ooh-needed" className="panel__title">
              Information needed
            </h2>
            <ul className="needed-list">
              {oohService.requiredInformation.map((item) => (
                <li key={item}>
                  <FlaskConical size={13} aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </section>

          <section className="panel" aria-labelledby="ooh-brief">
            <h2 id="ooh-brief" className="panel__title">
              Campaign brief
            </h2>
            {brief ? (
              <BriefDocument brief={brief} />
            ) : (
              <EmptyState
                icon={ClipboardList}
                title="OOH data isn't available yet."
                action={
                  <Button icon={ClipboardList} onClick={() => setBuilderOpen(true)}>
                    Build OOH Brief
                  </Button>
                }
              >
                Add campaign location and audience details to begin OOH planning.
              </EmptyState>
            )}
          </section>

          <Notice tone="info">
            Inventory, audience and pricing data can be connected later through an OOH data provider. Until then,
            this module never shows estimated figures.
          </Notice>
        </aside>
      </div>

      <OOHBriefBuilder
        open={builderOpen}
        analysis={analysis}
        onClose={() => setBuilderOpen(false)}
        onGenerated={setBrief}
      />
    </div>
  )
}
