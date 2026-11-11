import { ExternalLink, Megaphone, Square } from 'lucide-react'
import { useAdLibraries, type AdLibrariesState } from '../../hooks/useAdLibraries'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { AD_LIBRARY_LABEL } from '../../services/adLibraryService'
import type { AdLibraryResult } from '../../types/ads'
import type { MarketingAnalysis } from '../../types/analysis'
import { CategoryDetail } from '../overview/CategoryDetail'
import { Notice } from '../ui/Primitives'

const PERIOD: Record<AdLibraryResult['library'], string> = {
  google: 'shown in the last 30 days',
  meta: 'running right now',
  linkedin: 'shown in the last 30 days',
}

function formatChecked(iso: string): string {
  return new Date(iso).toLocaleString('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
}

function countText(r: { count: number; approximate?: boolean; atLeast: boolean }): string {
  return `${r.approximate ? '~' : ''}${r.count.toLocaleString('en-AU')}${r.atLeast ? '+' : ''}`
}

export default function AdvertisingModule({ analysis }: ModuleProps) {
  const ads = useAdLibraries(analysis)
  return (
    <CategoryDetail
      analysis={analysis}
      id="advertising"
      checksTitle="Advertising & measurement tags"
      description="How many ads this business is running on Google, Meta and LinkedIn, counted from their public ad libraries, plus the ad tracking tags on its website."
    >
      <AdsRunning analysis={analysis} ads={ads} />
    </CategoryDetail>
  )
}

function AdsRunning({ analysis, ads }: { analysis: MarketingAnalysis; ads: AdLibrariesState }) {
  const { report, progress } = ads
  const blocked = !ads.available || ads.disabled
  const tracking = analysis.page.tracking
  const tiktok = tracking.tiktokPixel

  return (
    <section className="panel" aria-labelledby="ads-running">
      <div className="panel__head">
        <h2 id="ads-running" className="panel__title">
          Ads running
        </h2>
        {report && !ads.running && <span className="panel__note">Last checked {formatChecked(report.checkedAt)}</span>}
      </div>
      {!ads.available && <Notice tone="info">Ad checks only work inside the Chrome extension.</Notice>}
      {ads.available && ads.disabled && (
        <Notice tone="attention">Online lookups are turned off in Settings. Turn them on to count ads.</Notice>
      )}

      {report && (
        <ul className="ads-grid">
          {report.results.map((r) => (
            <AdLibraryCard key={r.library} result={r} />
          ))}
        </ul>
      )}

      <div className="kw-run">
        {ads.running ? (
          <button type="button" className="btn btn--secondary" onClick={ads.stop}>
            <Square size={14} aria-hidden="true" /> Stop
          </button>
        ) : (
          <button type="button" className="btn btn--primary" onClick={ads.check} disabled={blocked}>
            <Megaphone size={15} aria-hidden="true" /> {report ? 'Check ads again' : 'Count ads on Google, Meta and LinkedIn'}
          </button>
        )}
      </div>
      {progress ? (
        <div className="kw-progress" role="status">
          <div className="meter__track">
            <span className="meter__fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
          </div>
          <p className="meter__caption">
            Reading {progress.step}. A tab is open in the background; leave it until this finishes (about a minute).
          </p>
        </div>
      ) : (
        <p className="panel__note">
          Opens Google’s, Meta’s and LinkedIn’s public ad libraries in a background tab and counts this business’s ads. Free;
          takes about a minute.
        </p>
      )}
      {ads.error && <Notice tone="attention">{ads.error}</Notice>}

      <div className="ads-other">
        <h3 className="kw-subtitle">Other ad platforms</h3>
        <p className="muted-text">
          {tiktok
            ? 'The TikTok Pixel is on this website, so TikTok ads are likely set up. TikTok only publishes its ad library for Europe, so they can’t be counted here.'
            : 'No TikTok Pixel was found on this page. TikTok, Microsoft (Bing) and most other ad platforms don’t publish ad libraries outside Europe, so their ads can’t be counted.'}
        </p>
      </div>
      <p className="muted-text panel__fineprint">
        Counts come from what each library shows at the time of the check. Google lists every ad pointing at this website;
        Meta and LinkedIn are searched by website and business name, and only ads from this business’s own pages are
        counted. Ad spend, clicks and results are not public.
      </p>
    </section>
  )
}

function AdLibraryCard({ result }: { result: AdLibraryResult }) {
  const running = result.count !== null && result.count > 0
  return (
    <li className={`ads-card${running ? ' ads-card--on' : ''}`}>
      <p className="ads-card__platform">{AD_LIBRARY_LABEL[result.library]}</p>
      {result.count === null ? (
        <p className="ads-card__error">{result.error}</p>
      ) : (
        <>
          <p className="ads-card__count">
            {countText({ ...result, count: result.count })}
            <span> {result.count === 1 && !result.atLeast ? 'ad' : 'ads'}</span>
          </p>
          <p className="ads-card__period">
            {running ? PERIOD[result.library] : `No ads ${PERIOD[result.library]}`}
            {result.allTime && ` · ${result.allTime} in total`}
          </p>
          {result.byPlatform && result.byPlatform.length > 0 && (
            <ul className="ads-card__split">
              {result.byPlatform.map((p) => (
                <li key={p.label}>
                  {p.label} <strong>{countText(p)}</strong>
                </li>
              ))}
            </ul>
          )}
          {result.advertisers.length > 0 && (
            <p className="ads-card__by">Run by {result.advertisers.join(', ')}</p>
          )}
        </>
      )}
      <a className="link ads-card__link" href={result.libraryUrl} target="_blank" rel="noreferrer noopener">
        See the ads <ExternalLink size={12} aria-hidden="true" />
      </a>
    </li>
  )
}
