import { useMemo } from 'react'
import { useCompetitorLocations } from '../../hooks/useCompetitorLocations'
import { LOCAL_MATCH_LABEL } from '../../services/competitorLocationService'
import { positionOf, reportPlaces, searchCompetitors, serviceOf } from '../../services/keywordService'
import type { MarketingAnalysis } from '../../types/analysis'
import type { KeywordReport } from '../../types/keywords'
import { formatDate } from '../../utils/format'
import { Position } from '../seo/KeywordRankings'

interface Props {
  analysis: MarketingAnalysis
  report: KeywordReport
  /** Class for each section and its heading, so the tables match the report they sit in. */
  sectionClass: string
  headingClass: string
  /** h3 when the tables sit inside a report section. */
  heading?: 'h2' | 'h3'
}

/** "You vs search competitors" and "Where the competitors are", from the saved SEO ranking check. */
export function SearchCompetitorTables({ analysis, report, sectionClass, headingClass, heading: Heading = 'h2' }: Props) {
  // Same pool and local filter as the SEO screen, so the report matches what was shown there.
  const competitors = useMemo(() => searchCompetitors(report, 10), [report])
  const loc = useCompetitorLocations(analysis, report, competitors)
  const compared = loc.visible.slice(0, 4)
  const looked = competitors.some((c) => loc.locations[c.domain])
  const listed = (looked ? loc.visible : competitors).slice(0, 6)

  if (competitors.length === 0) return null

  return (
    <>
      <section className={sectionClass}>
        <Heading className={headingClass}>You vs {looked ? 'local ' : ''}search competitors</Heading>
        <p className="search-compare__note">
          Google results checked on {formatDate(report.checkedAt)}. “not page 1–2” means not on the Google pages checked.
        </p>
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Search</th>
              <th scope="col" className="compare-table__self">
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
                <td className="compare-table__self">
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
      </section>

      <section className={sectionClass}>
        <Heading className={headingClass}>Where the competitors are</Heading>
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col">Competitor</th>
              <th scope="col">Address on their website</th>
              <th scope="col">Location</th>
              <th scope="col">Searches</th>
              <th scope="col">Avg position</th>
            </tr>
          </thead>
          <tbody>
            {listed.map((c) => {
              const found = loc.locations[c.domain]
              const { match: closeness, km } = loc.matchOf(c.domain)
              const match = LOCAL_MATCH_LABEL[closeness]
              return (
                <tr key={c.domain}>
                  <th scope="row">{c.domain}</th>
                  <td>{found ? found.address || (found.places.length ? found.places.join(', ') : '—') : '—'}</td>
                  <td>
                    {found ? (
                      <span className={`badge badge--compact badge--${match.tone}`}>
                        {match.label}
                        {km !== null && closeness !== 'unknown' && ` · ${km < 10 ? km.toFixed(1) : Math.round(km)} km`}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>{c.keywordCount}</td>
                  <td>#{c.averagePosition}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </section>
    </>
  )
}

/** "Rankings by location": where the site came up for each service in each place, from the saved SEO check. */
export function RankingsTable({ report, sectionClass, headingClass, heading: Heading = 'h2' }: Omit<Props, 'analysis'>) {
  const places = reportPlaces(report)
  const services = [...new Set(report.keywords.map(serviceOf))]
  return (
    <section className={sectionClass}>
      <Heading className={headingClass}>Google rankings{places.length > 0 ? ' by location' : ''}</Heading>
      <p className="search-compare__note">
        Where the website came up on Google for each search, checked on {formatDate(report.checkedAt)}.
      </p>
      <table className="compare-table">
        <thead>
          <tr>
            <th scope="col">{places.length > 0 ? 'Service' : 'Search'}</th>
            {places.length > 0 ? (
              places.map((p) => (
                <th key={p} scope="col">
                  {p}
                </th>
              ))
            ) : (
              <th scope="col">Position</th>
            )}
          </tr>
        </thead>
        <tbody>
          {places.length > 0
            ? services.map((service) => (
                <tr key={service}>
                  <th scope="row">{service}</th>
                  {places.map((place) => {
                    const ranking = report.keywords.find((k) => serviceOf(k) === service && k.place === place)
                    return <td key={place}>{ranking ? <Position value={ranking.position} ranking={ranking} /> : '—'}</td>
                  })}
                </tr>
              ))
            : report.keywords.map((k) => (
                <tr key={k.keyword}>
                  <th scope="row">{k.keyword}</th>
                  <td>
                    <Position value={k.position} ranking={k} />
                  </td>
                </tr>
              ))}
        </tbody>
      </table>
    </section>
  )
}
