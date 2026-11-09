import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, MapPin, Search, Users } from 'lucide-react'
import { useCompetitorLinks } from '../../hooks/useCompetitorLinks'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { websiteIntelService } from '../../services/websiteIntelService'
import type { IndustryId, MarketingAnalysis } from '../../types/analysis'
import type { WebsiteIntel } from '../../types/intel'
import { EmptyState } from '../ui/Primitives'

const SEARCH_TERM: Record<IndustryId, string> = {
  dental: 'dentist',
  medical: 'medical clinic',
  fitness: 'gym',
  retail: 'store',
  hospitality: 'restaurant',
  legal: 'lawyer',
  'real-estate': 'real estate agent',
  trades: 'tradesman',
  automotive: 'mechanic',
  beauty: 'beauty salon',
  education: 'tutoring',
  finance: 'accountant',
  construction: 'builder',
}

function searchQuery(a: MarketingAnalysis): string {
  const term = a.business.industry ? SEARCH_TERM[a.business.industry.id] : (a.page.headings.h1[0] ?? a.business.name).split(/\s+/).slice(0, 4).join(' ')
  const place = a.business.location?.label.split(',')[0] ?? ''
  return `${term} ${place}`.trim()
}

const yearOf = (iso: string | null | undefined) => (iso ? new Date(iso).getFullYear() : null)

interface Row {
  label: string
  value(a: MarketingAnalysis, intel: WebsiteIntel | null): string
}

const ROWS: Row[] = [
  { label: 'Technology', value: (a) => a.website.platform ?? 'Not identified' },
  { label: 'Page speed', value: (a) => (a.website.speed.lcpMs !== null ? `${(a.website.speed.lcpMs / 1000).toFixed(1)}s · ${a.website.speed.label.split(' — ')[0]}` : a.website.speed.label) },
  { label: 'Mobile', value: (a) => a.website.responsive.label },
  { label: 'Design', value: (a) => `${a.website.design.rating} (${a.website.design.score}/100)` },
  { label: 'Last updated', value: (a) => (a.website.lastUpdated.year ? String(a.website.lastUpdated.year) : 'Unknown') },
  { label: 'Online since', value: (_a, i) => String(yearOf(i?.domainInfo.registeredOn ?? i?.archive.firstSeen) ?? '—') },
  { label: 'Hosting', value: (_a, i) => i?.hosting.hostingProvider ?? (i?.hosting.cdn ? `Behind ${i.hosting.cdn}` : '—') },
  { label: 'SEO checks', value: (a) => (a.categories.seo.score !== null ? `${a.categories.seo.score}/100` : '—') },
  { label: 'Conversion', value: (a) => (a.categories.conversion.status === 'good' ? 'Good' : 'Needs work') },
  { label: 'Social links', value: (a) => String(a.business.socialPlatforms.length) },
  { label: 'Ad tracking', value: (a) => (a.page.tracking.googleAds || a.page.tracking.metaPixel ? 'Detected' : 'Not detected') },
]

export default function CompetitorsModule({ analysis }: ModuleProps) {
  const { candidates, linked, ids, toggle } = useCompetitorLinks(analysis)
  const [intelMap, setIntelMap] = useState<Record<string, WebsiteIntel | null>>({})
  const query = searchQuery(analysis)
  const compared = useMemo(() => [analysis, ...linked], [analysis, linked])

  // Cached intel only — no new network lookups for competitor rows.
  useEffect(() => {
    let cancelled = false
    void Promise.all(compared.map(async (a) => [a.id, await websiteIntelService.cached(a.business.domain)] as const)).then(
      (entries) => !cancelled && setIntelMap(Object.fromEntries(entries)),
    )
    return () => {
      cancelled = true
    }
  }, [compared])


  return (
    <div className="module">
      <header className="module-header">
        <div className="module-header__title-row">
          <span className="module-header__icon">
            <Users size={18} aria-hidden="true" />
          </span>
          <h1 className="module-header__title">Competitors</h1>
        </div>
        <p className="module-header__description">
          Find the prospect’s real competitors, analyse their websites, and compare them side by side. Linked competitors also appear in the client report as “How you compare”.
        </p>
      </header>

      <section className="panel" aria-labelledby="find-competitors">
        <h2 id="find-competitors" className="panel__title">
          1 · Find competitors
        </h2>
        <p>
          Search term: <strong>“{query}”</strong>
        </p>
        <div className="button-row button-row--start">
          <a className="btn btn--secondary btn--sm" href={`https://www.google.com/search?q=${encodeURIComponent(query)}`} target="_blank" rel="noreferrer noopener">
            <Search size={14} aria-hidden="true" /> Google search <ExternalLink size={12} aria-hidden="true" />
          </a>
          <a className="btn btn--secondary btn--sm" href={`https://www.google.com/maps/search/${encodeURIComponent(query)}`} target="_blank" rel="noreferrer noopener">
            <MapPin size={14} aria-hidden="true" /> Google Maps <ExternalLink size={12} aria-hidden="true" />
          </a>
        </div>
        <ol className="steps-list">
          <li>Open a competitor’s website from the results.</li>
          <li>Click the Shopa extension → <strong>Quick Analysis</strong>.</li>
          <li>Come back here and tick it below to compare.</li>
        </ol>
      </section>

      <section className="panel" aria-labelledby="pick-competitors">
        <h2 id="pick-competitors" className="panel__title">
          2 · Choose competitors to compare (up to 4)
        </h2>
        {candidates.length ? (
          <ul className="competitor-picks">
            {candidates.map((c) => (
              <li key={c.id}>
                <label className={`checkbox-card${ids.includes(c.id) ? ' checkbox-card--on' : ''}`}>
                  <input type="checkbox" checked={ids.includes(c.id)} onChange={() => toggle(c.id)} />
                  <span>
                    {c.business.name} <span className="muted-text mono">{c.business.domain}</span>
                  </span>
                </label>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={Users} title="No other analyses yet">
            Analyse a competitor’s website with the extension and it will appear here.
          </EmptyState>
        )}
      </section>

      {linked.length > 0 && (
        <section className="panel" aria-labelledby="compare-table">
          <h2 id="compare-table" className="panel__title">
            3 · Side-by-side comparison
          </h2>
          <div className="table-scroll">
            <table className="data-table">
              <thead>
                <tr>
                  <th scope="col">Signal</th>
                  {compared.map((a, i) => (
                    <th key={a.id} scope="col" className={i === 0 ? 'data-table__self-col' : undefined}>
                      {a.business.name}
                      {i === 0 && <span className="muted-text"> (prospect)</span>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row">{row.label}</th>
                    {compared.map((a, i) => (
                      <td key={a.id} className={i === 0 ? 'data-table__self-col' : undefined}>
                        {row.value(a, intelMap[a.id] ?? null)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted-text panel__fineprint">
            Each column is a real analysis of the competitor’s homepage. “Online since” and “Hosting” show when those sites’ details have been looked up (open them in the Website module).
          </p>
        </section>
      )}

    </div>
  )
}
