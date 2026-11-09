import { ExternalLink, Gauge, RefreshCw, Rocket, Sparkles, TriangleAlert } from 'lucide-react'
import { useWebsiteIntel } from '../../hooks/useWebsiteIntel'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { buildWebsiteFacts } from '../../services/websiteFacts'
import { formatDate, listJoin, plural, truncate } from '../../utils/format'
import { CategoryDetail } from '../overview/CategoryDetail'
import { Button } from '../ui/Button'
import { KeyValue, Notice } from '../ui/Primitives'
import { WebsiteFactsGrid } from './WebsiteFactsGrid'

const NOT_DETECTED = <span className="muted-text">Not detected</span>

const FIT_COPY = {
  strong: { title: 'Strong website upgrade opportunity', tone: 'strong' },
  moderate: { title: 'Website refresh worth proposing', tone: 'moderate' },
  low: { title: 'Website is in reasonable shape', tone: 'low' },
} as const

export default function WebsiteModule({ analysis }: ModuleProps) {
  const { page, website } = analysis
  const intelState = useWebsiteIntel(analysis)
  const { intel, loading, disabled, pageSpeedRunning } = intelState
  const facts = buildWebsiteFacts(analysis, intel, loading)
  const fit = FIT_COPY[website.rebuildFit]
  const psi = intel?.pageSpeed

  return (
    <CategoryDetail
      analysis={analysis}
      id="website"
      description="Everything needed to pitch a website project: technology, age, speed, mobile, design freshness, domain and hosting — plus foundational quality checks."
      aside={
        <>
          <section className="panel" aria-labelledby="speed-panel">
            <h2 id="speed-panel" className="panel__title">
              Page speed
            </h2>
            <dl className="kv-grid">
              <KeyValue label="Main content (LCP)">{website.speed.lcpMs !== null ? `${(website.speed.lcpMs / 1000).toFixed(2)}s` : NOT_DETECTED}</KeyValue>
              <KeyValue label="Full load">{website.speed.loadMs !== null ? `${(website.speed.loadMs / 1000).toFixed(2)}s` : NOT_DETECTED}</KeyValue>
              <KeyValue label="Layout shift (CLS)">{website.speed.cls ?? NOT_DETECTED}</KeyValue>
              <KeyValue label="Page weight">{website.speed.pageWeightKb !== null ? `${(website.speed.pageWeightKb / 1024).toFixed(1)} MB or more` : NOT_DETECTED}</KeyValue>
              <KeyValue label="Requests">{plural(page.performance.requestCount, 'request')}</KeyValue>
            </dl>
            <p className="muted-text panel__fineprint">Measured in your browser on this visit — repeat visits can be faster due to caching.</p>
            {psi?.status === 'ok' && (
              <div className="psi">
                <span className={`psi__score psi__score--${psi.performanceScore! >= 90 ? 'good' : psi.performanceScore! >= 50 ? 'fair' : 'poor'}`}>{psi.performanceScore}</span>
                <div>
                  <p className="psi__title">Google PageSpeed (mobile)</p>
                  <p className="muted-text">
                    LCP {psi.lcpMs !== null ? `${(psi.lcpMs / 1000).toFixed(1)}s` : '—'} · TBT {psi.tbtMs ?? '—'}ms · CLS {psi.cls ?? '—'} · {formatDate(psi.fetchedAt)}
                  </p>
                </div>
              </div>
            )}
            {psi && psi.status !== 'ok' && (
              <Notice tone="attention" icon={TriangleAlert}>
                {psi.message}
              </Notice>
            )}
            <Button size="sm" icon={Gauge} disabled={!intel || pageSpeedRunning} onClick={intelState.runPageSpeed}>
              {pageSpeedRunning ? 'Running Google test (up to 60s)…' : psi?.status === 'ok' ? 'Re-run Google PageSpeed' : 'Run Google PageSpeed test'}
            </Button>
          </section>

          <section className="panel" aria-labelledby="og-preview">
            <h2 id="og-preview" className="panel__title">
              Share preview (Open Graph)
            </h2>
            <div className="og-card">
              <p className="og-card__site mono">{page.openGraph.siteName ?? page.domain}</p>
              <p className="og-card__title">{page.openGraph.title ?? <span className="muted-text">No og:title</span>}</p>
              <p className="og-card__desc">{page.openGraph.description ?? <span className="muted-text">No og:description</span>}</p>
              <p className="og-card__image mono">{page.openGraph.image ? `Image: ${truncate(page.openGraph.image, 60)}` : 'No og:image'}</p>
            </div>
          </section>
        </>
      }
    >
      <section className={`rebuild rebuild--${fit.tone}`} aria-labelledby="rebuild-title">
        <span className="rebuild__icon">
          <Rocket size={18} aria-hidden="true" />
        </span>
        <div>
          <h2 id="rebuild-title" className="rebuild__title">
            {fit.title}
          </h2>
          <p className="rebuild__reasons">
            {website.rebuildReasons.length
              ? `The site ${listJoin(website.rebuildReasons)}.`
              : 'No major rebuild signals — focus the pitch on conversion, SEO or ads instead.'}
          </p>
        </div>
      </section>

      <section className="panel" aria-labelledby="site-profile">
        <div className="panel__head">
          <h2 id="site-profile" className="panel__title">
            Website profile
          </h2>
          <div className="panel__actions">
            {intel?.archive.historyUrl && (
              <a className="link panel__note" href={intel.archive.historyUrl} target="_blank" rel="noreferrer noopener">
                Archive history <ExternalLink size={11} aria-hidden="true" />
              </a>
            )}
            {!disabled && (
              <Button size="sm" variant="ghost" icon={RefreshCw} disabled={loading} onClick={intelState.refresh}>
                Refresh
              </Button>
            )}
          </div>
        </div>
        <WebsiteFactsGrid facts={facts} />
        {disabled && (
          <Notice tone="info">Online lookups are switched off in Settings, so domain, hosting and “online since” aren’t checked.</Notice>
        )}
      </section>

      <section className="panel" aria-labelledby="design-signals">
        <h2 id="design-signals" className="panel__title">
          Design freshness — {website.design.score}/100
        </h2>
        <div className="signal-columns">
          <div>
            <h3 className="signal-columns__title signal-columns__title--good">
              <Sparkles size={13} aria-hidden="true" /> Modern signals
            </h3>
            <ul>{website.design.modernSignals.length ? website.design.modernSignals.map((s) => <li key={s}>{s}</li>) : <li className="muted-text">None detected</li>}</ul>
          </div>
          <div>
            <h3 className="signal-columns__title signal-columns__title--attention">
              <TriangleAlert size={13} aria-hidden="true" /> Dated signals
            </h3>
            <ul>{website.design.datedSignals.length ? website.design.datedSignals.map((s) => <li key={s}>{s}</li>) : <li className="muted-text">None detected</li>}</ul>
          </div>
        </div>
        <p className="muted-text panel__fineprint">Heuristic indicators from the page’s code — always confirm with a visual review before pitching.</p>
      </section>

      <section className="panel" aria-labelledby="tech-stack">
        <h2 id="tech-stack" className="panel__title">
          Technology detected
        </h2>
        {website.techStack.length ? (
          <ul className="tech-chips">
            {website.techStack.map((t) => (
              <li key={t.name} className={`tech-chip${t.outdated ? ' tech-chip--outdated' : ''}`}>
                <span className="tech-chip__name">{t.name}</span>
                {t.version && <span className="tech-chip__version">{t.version}</span>}
                <span className="tech-chip__cat">{t.outdated ? 'outdated' : t.category}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-text">No platform or library fingerprints found — likely a custom build or heavily optimised site.</p>
        )}
      </section>

      <section className="panel" aria-labelledby="page-snapshot">
        <h2 id="page-snapshot" className="panel__title">
          Page snapshot
        </h2>
        <dl className="kv-grid">
          <KeyValue label="Title">{page.title || NOT_DETECTED}</KeyValue>
          <KeyValue label="Meta description">{page.metaDescription ?? NOT_DETECTED}</KeyValue>
          <KeyValue label="H1">{page.headings.h1.length ? page.headings.h1.join(' · ') : NOT_DETECTED}</KeyValue>
          <KeyValue label="Images">
            {plural(page.images.total, 'image')} · {page.images.missingAlt} missing alt · {page.design.modernImages} WebP/AVIF
          </KeyValue>
          <KeyValue label="CTAs">{page.ctas.length ? page.ctas.slice(0, 5).map((c) => c.text).join(' · ') : NOT_DETECTED}</KeyValue>
          <KeyValue label="Contact">{[...page.phones.slice(0, 2), ...page.emails.slice(0, 2)].join(' · ') || NOT_DETECTED}</KeyValue>
          <KeyValue label="Fonts">{page.design.webFonts.join(', ') || NOT_DETECTED}</KeyValue>
        </dl>
      </section>
    </CategoryDetail>
  )
}
