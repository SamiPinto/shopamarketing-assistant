import { MapPin, Plus, Search, Sparkles, Square } from 'lucide-react'
import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useCompetitorLocations } from '../../hooks/useCompetitorLocations'
import { useKeywordResearch, type KeywordResearchState } from '../../hooks/useKeywordResearch'
import { useRankedKeywords } from '../../hooks/useRankedKeywords'
import { isLocal, LOCAL_MATCH_LABEL } from '../../services/competitorLocationService'
import { matchesDomain } from '../../data/directories'
import {
  DATAFORSEO_ENABLED,
  RANKED_ITEM_COST,
  RANKED_KEYWORD_LIMIT,
  RANKED_REQUEST_COST,
  dataForSeoBalance,
} from '../../services/dataForSeoService'
import {
  MARKET_CHOICES,
  MAX_PLACES,
  MAX_SEARCHES,
  MAX_SELECTED,
  pageOf,
  positionOf,
  reportPlaces,
  searchCompetitors,
  reportDomain,
  serviceFromKeyword,
  serviceOf,
  volumeOf,
} from '../../services/keywordService'
import type { MarketingAnalysis } from '../../types/analysis'
import type { KeywordRanking, KeywordReport } from '../../types/keywords'
import { Notice } from '../ui/Primitives'

const PAGE_OPTIONS = [
  { value: 1, label: 'Page 1 only' },
  { value: 2, label: 'Pages 1–2' },
  { value: 3, label: 'Pages 1–3' },
]

function notFoundText(ranking: KeywordRanking): string {
  if (!ranking.pagesChecked) return '?'
  return ranking.pagesChecked === 1 ? 'not p1' : `not p1–${ranking.pagesChecked}`
}

// DataForSEO list prices (USD): a live Google results page of 10, and one search-volume request.
const SERP_PAGE_COST = 0.002
const VOLUME_REQUEST_COST = 0.075

const money = (usd: number) => `US$${usd < 1 ? usd.toFixed(3) : usd.toFixed(2)}`

/** "1.3k/mo" style search volume, "<10/mo" when Google Ads can't measure it. */
function volumeText(report: KeywordReport, keyword: string): string | null {
  const v = volumeOf(report, keyword)
  if (!v) return null
  if (!v.volume) return '<10/mo'
  return `${v.volume >= 1000 ? `${(v.volume / 1000).toFixed(v.volume >= 10000 ? 0 : 1)}k` : v.volume}/mo`
}

/** Money left on the DataForSEO account; null until loaded or when it can't be read. */
function useDataForSeoBalance(refresh: unknown): number | null {
  const [balance, setBalance] = useState<number | null>(null)
  useEffect(() => {
    if (!DATAFORSEO_ENABLED) return
    let cancelled = false
    void dataForSeoBalance()
      .then((value) => {
        if (!cancelled) setBalance(value)
      })
      .catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [refresh])
  return balance
}

function formatChecked(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

export function KeywordRankings({ analysis }: { analysis: MarketingAnalysis }) {
  const kw = useKeywordResearch(analysis)
  const [draft, setDraft] = useState('')
  const blocked = !kw.available || kw.disabled
  const balance = useDataForSeoBalance(kw.report?.checkedAt)

  const [placeDraft, setPlaceDraft] = useState('')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    kw.addKeyword(draft)
    setDraft('')
  }

  const submitPlace = (event: FormEvent) => {
    event.preventDefault()
    kw.addPlace(placeDraft)
    setPlaceDraft('')
  }

  const searches = kw.searchCount
  const tooMany = searches > MAX_SEARCHES
  const worstCase = searches * kw.maxPages
  const placeCount = kw.selectedPlaces.length
  const estimate = searches * kw.maxPages * SERP_PAGE_COST + VOLUME_REQUEST_COST

  return (
    <>
      <section className="panel" aria-labelledby="kw-setup">
        <div className="panel__head">
          <h2 id="kw-setup" className="panel__title">
            Keyword rankings on Google
          </h2>
          {kw.report && !kw.running && (
            <span className="panel__note">
              Last checked {formatChecked(kw.report.checkedAt)} · {kw.report.market.replace(/^www\./, '')}
              {kw.report.provider === 'dataforseo' && ` · DataForSEO${kw.report.cost ? ` (${money(kw.report.cost)})` : ''}`}
            </span>
          )}
        </div>

        {!kw.available && (
          <Notice tone="info">Ranking checks only work inside the Chrome extension.</Notice>
        )}
        {kw.available && kw.disabled && (
          <Notice tone="attention">Online lookups are turned off in Settings. Turn them on to check Google rankings.</Notice>
        )}

        {kw.paid ? (
          <p className="panel__note">
            Using DataForSEO: results as Google shows them to someone in each location, with monthly search volumes.
            {balance !== null && ` Balance: ${money(balance)}.`}
          </p>
        ) : (
          <p className="panel__note">
            Using the free method (a Google tab). Add a DataForSEO login to .env for true local results and search volumes.
          </p>
        )}
        <p className="muted-text">
          Each service is searched in each suburb, city or pincode, the way local customers search (for example “blocked
          drains 2150”). This shows where the site and its competitors rank in every area, on Google
          {kw.market.code === 'WW' ? '' : ` in ${kw.market.name}`}.
        </p>
        {kw.country ? (
          <p className="panel__note">
            Country detected: {kw.country.name} (from {kw.country.basis.toLowerCase()}).
            {kw.market.code !== kw.country.code && ` Searching ${kw.market.name} instead, as chosen below.`}
          </p>
        ) : (
          <Notice tone="attention">
            The site doesn’t make its country clear (no matching address, phone format or domain), so searches use worldwide
            google.com. Pick the right country below for accurate local rankings.
          </Notice>
        )}

        <h3 className="kw-subtitle">1 · Where: suburbs, cities or pincodes (up to {MAX_PLACES})</h3>
        <ul className="kw-chips" aria-label="Locations to check">
          {kw.places.map((p) => {
            const on = kw.selectedPlaces.includes(p.label)
            return (
              <li key={p.label}>
                <label className={`kw-chip${on ? ' kw-chip--on' : ''}`} title={p.basis}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={kw.running || (!on && placeCount >= MAX_PLACES)}
                    onChange={() => kw.togglePlace(p.label)}
                  />
                  <MapPin size={12} aria-hidden="true" />
                  {p.label}
                  {p.kind === 'postcode' && <span className="kw-chip__tag">pincode</span>}
                </label>
              </li>
            )
          })}
        </ul>
        {kw.places.length === 0 && (
          <p className="muted-text">
            No address was found on this page. Add the suburbs, cities or pincodes this business serves.
          </p>
        )}
        <form className="kw-add" onSubmit={submitPlace}>
          <input
            type="text"
            value={placeDraft}
            onChange={(e) => setPlaceDraft(e.target.value)}
            placeholder="Add a suburb, city or pincode, e.g. Westmead or 2145"
            aria-label="Add a location"
            disabled={kw.running}
          />
          <button type="submit" className="btn btn--secondary btn--sm" disabled={kw.running || !placeDraft.trim()}>
            <Plus size={14} aria-hidden="true" /> Add
          </button>
        </form>
        {placeCount === 0 && kw.places.length > 0 && (
          <p className="panel__note">No location ticked: services are searched on their own, as Google shows them from your current location.</p>
        )}

        <h3 className="kw-subtitle">2 · What: services (up to {MAX_SELECTED})</h3>
        <ul className="kw-chips" aria-label="Keywords to check">
          {kw.candidates.map((c) => {
            const on = kw.selected.includes(c.keyword)
            return (
              <li key={c.keyword}>
                <label className={`kw-chip${on ? ' kw-chip--on' : ''}`} title={c.basis}>
                  <input
                    type="checkbox"
                    checked={on}
                    disabled={kw.running || (!on && kw.selected.length >= MAX_SELECTED)}
                    onChange={() => kw.toggle(c.keyword)}
                  />
                  {c.keyword}
                  {c.source === 'autocomplete' && <span className="kw-chip__tag">Google</span>}
                </label>
              </li>
            )
          })}
        </ul>
        {kw.candidates.length === 0 && (
          <p className="muted-text">No keyword ideas could be taken from this page. Add the services this business sells below.</p>
        )}

        <form className="kw-add" onSubmit={submit}>
          <input
            type="text"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Add a service, e.g. emergency plumber"
            aria-label="Add a service"
            disabled={kw.running}
          />
          <button type="submit" className="btn btn--secondary btn--sm" disabled={kw.running || !draft.trim()}>
            <Plus size={14} aria-hidden="true" /> Add
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={kw.findMoreIdeas} disabled={blocked || kw.running || kw.suggesting}>
            <Sparkles size={14} aria-hidden="true" /> {kw.suggesting ? 'Asking Google…' : 'More ideas from Google'}
          </button>
        </form>

        <div className="kw-run">
          <label className="select-field">
            <span className="select-field__label">Google</span>
            <select value={kw.market.code} onChange={(e) => kw.setMarket(e.target.value)} disabled={kw.running}>
              {MARKET_CHOICES.map((m) => (
                <option key={m.code} value={m.code}>
                  {m.name} ({m.googleHost.replace(/^www\./, '')})
                </option>
              ))}
            </select>
          </label>
          <label className="select-field">
            <span className="select-field__label">Depth</span>
            <select value={kw.maxPages} onChange={(e) => kw.setMaxPages(Number(e.target.value))} disabled={kw.running}>
              {PAGE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          {kw.running ? (
            <button type="button" className="btn btn--secondary" onClick={kw.stop}>
              <Square size={14} aria-hidden="true" /> Stop
            </button>
          ) : (
            <button type="button" className="btn btn--primary" onClick={kw.check} disabled={blocked || searches === 0 || tooMany}>
              <Search size={15} aria-hidden="true" /> Run {searches} search{searches === 1 ? '' : 'es'}
              {kw.paid ? ` (about ${money(estimate)})` : ' on Google'}
            </button>
          )}
        </div>
        {kw.selected.length > 0 && (
          <p className="panel__note">
            {kw.selected.length} service{kw.selected.length === 1 ? '' : 's'}
            {placeCount > 0 && ` × ${placeCount} location${placeCount === 1 ? '' : 's'}`} = {searches} search
            {searches === 1 ? '' : 'es'}.
          </p>
        )}
        {tooMany && (
          <Notice tone="attention">
            {kw.paid
              ? `That’s more than ${MAX_SEARCHES} searches. Untick some services or locations to keep the tables readable.`
              : `That’s more than ${MAX_SEARCHES} searches, which makes Google likely to block the check. Untick some services or locations.`}
          </Notice>
        )}

        {kw.progress ? (
          <div className="kw-progress" role="status">
            <div className="meter__track">
              <span className="meter__fill" style={{ width: `${(kw.progress.done / kw.progress.total) * 100}%` }} />
            </div>
            <p className="meter__caption">
              {kw.paid
                ? `${kw.progress.done} of ${kw.progress.total} done, now “${kw.progress.keyword}” via DataForSEO.`
                : `${kw.progress.done + 1} of ${kw.progress.total}: “${kw.progress.keyword}”, Google page ${kw.progress.page}. A Google tab is open in the background; leave it until this finishes.`}
            </p>
            {kw.progress.captcha && (
              <Notice tone="attention" title="Google wants to check you’re not a robot">
                Complete the check in the Google tab that just opened. Checking carries on by itself afterwards (it waits up to 3
                minutes).
              </Notice>
            )}
          </div>
        ) : kw.paid ? (
          <p className="panel__note">
            {searches * kw.maxPages} Google result page{searches * kw.maxPages === 1 ? '' : 's'} plus one search-volume request,
            charged to the DataForSEO balance. Takes about {Math.max(1, Math.round((searches * 8) / 3 / 60))} min.
          </p>
        ) : (
          <p className="panel__note">
            Up to {worstCase} Google searches, spaced a few seconds apart (about {Math.max(1, Math.round((worstCase * 7) / 60))}{' '}
            min at most). Pages after the first are only read until the site is found. If Google asks you to confirm you’re not a
            robot, complete it in the Google tab and checking continues.
          </p>
        )}

        {kw.error && <Notice tone="attention">{kw.error}</Notice>}
        {kw.report?.stoppedReason && !kw.running && <Notice tone="attention">{kw.report.stoppedReason}</Notice>}
      </section>

      {kw.paid && kw.available && !kw.disabled && <AlreadyRanking analysis={analysis} kw={kw} />}

      {kw.report && kw.report.keywords.length > 0 && <KeywordResults analysis={analysis} report={kw.report} />}
    </>
  )
}

const ALREADY_SHOWN = 20

/** Keywords the site already ranks for anywhere in the country (DataForSEO Labs), with a way to check them locally. */
function AlreadyRanking({ analysis, kw }: { analysis: MarketingAnalysis; kw: KeywordResearchState }) {
  const ranked = useRankedKeywords(reportDomain(analysis), kw.market.code)
  const [showAll, setShowAll] = useState(false)
  const report = ranked.report
  const rows = report ? (showAll ? report.keywords : report.keywords.slice(0, ALREADY_SHOWN)) : []
  const estimate = RANKED_REQUEST_COST + RANKED_KEYWORD_LIMIT * RANKED_ITEM_COST

  return (
    <section className="panel" aria-labelledby="kw-already">
      <div className="panel__head">
        <h2 id="kw-already" className="panel__title">
          Keywords {analysis.business.name} already ranks for
        </h2>
        {report && (
          <span className="panel__note">
            Looked up {formatChecked(report.checkedAt)} · {money(report.cost)}
          </span>
        )}
      </div>
      <p className="muted-text">
        Every Google search this site appears for in the top 50 across {kw.market.code === 'WW' ? 'the US' : kw.market.name},
        not just the services in its headings. Most-searched first. Comes from DataForSEO’s database of Google results
        (updated monthly), so positions are country-wide; use “Check locally” to see the position in each suburb or pincode.
      </p>
      <div className="kw-run">
        <button type="button" className="btn btn--secondary" onClick={ranked.load} disabled={ranked.loading || kw.running}>
          <Search size={15} aria-hidden="true" />
          {ranked.loading ? ' Looking up…' : ` ${report ? 'Refresh' : 'Look up'} ranking keywords (about ${money(estimate)})`}
        </button>
      </div>
      {ranked.error && <Notice tone="attention">{ranked.error}</Notice>}
      {report && report.keywords.length === 0 && (
        <Notice tone="info">
          DataForSEO has no Google rankings in the top 50 for this site in {kw.market.name}. That is common for small local
          businesses, and is itself a selling point: the site is close to invisible on Google.
        </Notice>
      )}
      {report && report.keywords.length > 0 && (
        <>
          <p className="panel__note">
            Ranks for {report.total.toLocaleString()} keyword{report.total === 1 ? '' : 's'} in the top 50
            {report.total > report.keywords.length ? `; the ${report.keywords.length} most searched are listed` : ''}.
          </p>
          <div className="table-scroll">
            <table className="data-table kw-table">
              <thead>
                <tr>
                  <th scope="col">Keyword</th>
                  <th scope="col">Position</th>
                  <th scope="col">Searches / month</th>
                  <th scope="col">Ranking page</th>
                  <th scope="col">
                    <span className="sr-only">Action</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((k) => {
                  const service = serviceFromKeyword(analysis, k.keyword)
                  const added = kw.selected.includes(service)
                  const page = Math.ceil(k.position / 10)
                  const tone = k.position <= 3 ? 'good' : page === 1 ? 'info' : 'attention'
                  return (
                    <tr key={k.keyword}>
                      <th scope="row">{k.keyword}</th>
                      <td>
                        <span className={`kw-pos kw-pos--${tone}`}>
                          #{k.position}
                          <span className="kw-pos__page"> · p{page}</span>
                        </span>
                      </td>
                      <td>{k.volume ? k.volume.toLocaleString() : '<10'}</td>
                      <td className="mono" title={k.url}>
                        {pathOf(k.url)}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--ghost btn--sm"
                          onClick={() => kw.addKeyword(service)}
                          disabled={added || kw.running || kw.selected.length >= MAX_SELECTED}
                          title={`Adds “${service}” to the services checked in each location`}
                        >
                          {added ? 'Added' : 'Check locally'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {report.keywords.length > ALREADY_SHOWN && (
            <button type="button" className="btn btn--ghost btn--sm" onClick={() => setShowAll((v) => !v)}>
              {showAll ? 'Show fewer' : `Show all ${report.keywords.length}`}
            </button>
          )}
        </>
      )}
    </section>
  )
}

function pathOf(url: string): string {
  try {
    return new URL(url).pathname || '/'
  } catch {
    return url
  }
}

function KeywordResults({ analysis, report }: { analysis: MarketingAnalysis; report: KeywordReport }) {
  // A wider pool than shown, so filtering to local competitors still leaves some.
  const competitors = useMemo(() => searchCompetitors(report, 10), [report])
  const loc = useCompetitorLocations(analysis, report, competitors)
  const compared = loc.visible.slice(0, 4)
  const places = useMemo(() => reportPlaces(report), [report])
  const services = useMemo(() => [...new Set(report.keywords.map(serviceOf))], [report])
  const { matchOf, localOnly } = loc
  const placeLeaders = useMemo(
    // Leaders are drawn from local competitors when that filter is on.
    () => leadersByPlace(report, places, localOnly ? (domain) => isLocal(matchOf(domain).match) : () => true),
    [report, places, localOnly, matchOf],
  )

  return (
    <>
      {places.length > 0 && (
        <section className="panel" aria-labelledby="kw-grid">
          <div className="panel__head">
            <h2 id="kw-grid" className="panel__title">
              Rankings by location
            </h2>
            <span className="panel__note">
              Each cell is the Google search “service + location”{report.volumes ? ', with its monthly searches' : ''}
            </span>
          </div>
          <div className="table-scroll">
            <table className="data-table kw-table">
              <thead>
                <tr>
                  <th scope="col">Service</th>
                  {places.map((p) => (
                    <th key={p} scope="col">
                      {p}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service}>
                    <th scope="row">
                      {service}
                      {volumeText(report, service) && <span className="kw-volume"> {volumeText(report, service)}</span>}
                    </th>
                    {places.map((p) => {
                      const ranking = report.keywords.find((k) => serviceOf(k) === service && k.place === p)
                      const volume = ranking && volumeText(report, ranking.keyword)
                      return (
                        <td key={p}>
                          {ranking ? <Position value={ranking.position} ranking={ranking} /> : <span className="kw-pos kw-pos--none">—</span>}
                          {volume && (
                            <span className="kw-volume" title={`Monthly Google searches for “${ranking.keyword}”`}>
                              {' '}
                              {volume}
                            </span>
                          )}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {placeLeaders.length > 0 && (
            <p className="muted-text panel__fineprint">
              Top competitor by location:{' '}
              {placeLeaders.map((l) => `${l.place}: ${l.domain} (${l.count} of ${services.length} services on page 1)`).join('; ')}.
            </p>
          )}
        </section>
      )}

      {competitors.length > 0 && (
        <section className="panel" aria-labelledby="kw-where">
          <div className="panel__head">
            <h2 id="kw-where" className="panel__title">
              Where the competitors are
            </h2>
            <label className="kw-toggle">
              <input type="checkbox" checked={loc.localOnly} onChange={(e) => loc.setLocalOnly(e.target.checked)} />
              Local competitors only
            </label>
          </div>
          <p className="muted-text">
            Google shows businesses from all over the country. Reading each competitor’s own website (homepage, then contact
            page) shows whether it is actually in the same suburb or pincode as {analysis.business.name}.
          </p>
          {loc.pending.length > 0 && (
            <div className="kw-run">
              <button type="button" className="btn btn--secondary" onClick={loc.lookup} disabled={loc.running}>
                <MapPin size={15} aria-hidden="true" />
                {loc.running ? ' Reading competitor websites…' : ` Find addresses for ${loc.pending.length} competitor website${loc.pending.length === 1 ? '' : 's'}`}
              </button>
              <span className="panel__note">Chrome asks once for access to just these sites.</span>
            </div>
          )}
          {loc.error && <Notice tone="attention">{loc.error}</Notice>}
          <div className="table-scroll">
            <table className="data-table kw-table">
              <thead>
                <tr>
                  <th scope="col">Competitor</th>
                  <th scope="col">Address on their website</th>
                  <th scope="col">Location</th>
                  <th scope="col">Keywords</th>
                  <th scope="col">Avg position</th>
                </tr>
              </thead>
              <tbody>
                {competitors.map((c) => {
                  const found = loc.locations[c.domain]
                  const { match: closeness, km } = loc.matchOf(c.domain)
                  const match = LOCAL_MATCH_LABEL[closeness]
                  const hidden = loc.localOnly && found && !isLocal(closeness)
                  return (
                    <tr key={c.domain} className={hidden ? 'kw-row--muted' : undefined}>
                      <th scope="row">{c.domain}</th>
                      <td>
                        {found
                          ? found.address || (found.places.length ? found.places.join(', ') : found.error)
                          : loc.running
                            ? 'Reading…'
                            : 'Not looked up yet'}
                      </td>
                      <td>
                        {found && (
                          <span className={`badge badge--compact badge--${match.tone}`}>
                            {match.label}
                            {km !== null && closeness !== 'unknown' && ` · ${km < 10 ? km.toFixed(1) : Math.round(km)} km`}
                          </span>
                        )}
                      </td>
                      <td>{c.keywordCount}</td>
                      <td>#{c.averagePosition}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          {loc.localOnly && Object.keys(loc.locations).length > 0 && (
            <p className="muted-text panel__fineprint">
              Greyed-out competitors are more than 15 km away (or only in the same state) and are left out of the comparison and the
              per-location leaders below. “Address not found” is kept: the site may show its address only with JavaScript.
            </p>
          )}
        </section>
      )}

      <section className="panel" aria-labelledby="kw-compare">
        <div className="panel__head">
          <h2 id="kw-compare" className="panel__title">
            You vs {loc.localOnly && Object.keys(loc.locations).length > 0 ? 'local ' : ''}search competitors
          </h2>
          <span className="panel__note">“not p1–2” = not on the Google pages checked</span>
        </div>
        {compared.length === 0 && (
          <p className="muted-text">
            {competitors.length > 0
              ? 'None of these competitors are in the same suburb or pincode. Turn off “Local competitors only” to compare with them anyway.'
              : 'No business showed up for more than one keyword, so there are no clear search competitors yet.'}
          </p>
        )}
        <div className="table-scroll">
          <table className="data-table kw-table">
            <thead>
              <tr>
                <th scope="col">Keyword</th>
                <th scope="col" className="data-table__self-col">
                  {analysis.business.name}
                </th>
                {compared.map((c) => (
                  <th key={c.domain} scope="col">
                    {c.domain}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {report.keywords.map((k) => (
                <tr key={k.keyword}>
                  <th scope="row">{k.keyword}</th>
                  <td className="data-table__self-col">
                    <Position value={k.position} ranking={k} />
                  </td>
                  {compared.map((c) => (
                    <td key={c.domain}>
                      <Position value={positionOf(k, c.domain)} ranking={k} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {compared.length > 0 && (
          <p className="muted-text panel__fineprint">
            Competitors are the businesses that appear most often in these results ({compared
              .map((c) => `${c.domain}: ${c.keywordCount} keywords, avg #${c.averagePosition}`)
              .join('; ')}
            ). Directories, social networks and marketplaces are left out. Positions count organic results only; ads and the map
            pack are excluded, and results can differ slightly by searcher location.
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="kw-serps">
        <h2 id="kw-serps" className="panel__title">
          What Google shows (page 1)
        </h2>
        <div className="kw-serps">
          {report.keywords.map((k) => (
            <details key={k.keyword} className="kw-serp">
              <summary>
                <span>{k.keyword}</span>
                <span className="kw-serp__you">
                  You: <Position value={k.position} ranking={k} />
                </span>
              </summary>
              {k.error && <p className="muted-text">{k.error}</p>}
              <ol className="kw-serp__list">
                {k.results
                  .filter((r) => pageOf(k, r.position) === 1 || r.position === k.position)
                  .map((r) => (
                    <li key={r.position} className={r.position === k.position ? 'kw-serp__row kw-serp__row--you' : 'kw-serp__row'}>
                      <span className="kw-serp__pos mono">#{r.position}</span>
                      <span className="kw-serp__body">
                        <a href={r.url} target="_blank" rel="noreferrer">
                          {r.title || r.domain}
                        </a>
                        <span className="kw-serp__domain">
                          {r.display || r.domain}
                          {r.directory && ' · directory'}
                        </span>
                      </span>
                    </li>
                  ))}
              </ol>
            </details>
          ))}
        </div>
      </section>
    </>
  )
}

/** In each place, the competitor on page 1 for the most services (among those `include` allows). */
function leadersByPlace(report: KeywordReport, places: string[], include: (domain: string) => boolean) {
  return places.flatMap((place) => {
    const counts = new Map<string, number>()
    for (const k of report.keywords.filter((r) => r.place === place)) {
      const seen = new Set(
        k.results
          .filter((r) => r.page === 1 && !r.directory && !matchesDomain(r.domain, report.domain) && include(r.domain))
          .map((r) => r.domain),
      )
      for (const d of seen) counts.set(d, (counts.get(d) ?? 0) + 1)
    }
    const [best] = [...counts.entries()].sort((a, b) => b[1] - a[1])
    return best && best[1] >= 2 ? [{ place, domain: best[0], count: best[1] }] : []
  })
}

function Position({ value, ranking }: { value: number | null; ranking: KeywordRanking }) {
  if (value === null) return <span className="kw-pos kw-pos--none">{notFoundText(ranking)}</span>
  const page = pageOf(ranking, value)
  const tone = value <= 3 ? 'good' : page === 1 ? 'info' : 'attention'
  return (
    <span
      className={`kw-pos kw-pos--${tone}`}
      title={`Google page ${page}${value === ranking.position && ranking.rankingDisplay ? ` · ranking page: ${ranking.rankingDisplay}` : ''}`}
    >
      #{value}
      <span className="kw-pos__page"> · p{page}</span>
    </span>
  )
}
