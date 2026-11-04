import type { ModuleProps } from '../../pages/dashboardRoutes'
import { CategoryDetail } from '../overview/CategoryDetail'
import { Notice } from '../ui/Primitives'

export default function SeoModule({ analysis }: ModuleProps) {
  const { page } = analysis
  return (
    <CategoryDetail
      analysis={analysis}
      id="seo"
      checksTitle="SEO check"
      description="Deterministic on-page SEO checks. Expand “Why this matters” for the reasoning behind each check."
      aside={
        <section className="panel" aria-labelledby="serp-preview">
          <h2 id="serp-preview" className="panel__title">
            Search result preview
          </h2>
          <div className="serp">
            <p className="serp__url mono">{page.canonical ?? page.url}</p>
            <p className="serp__title">{page.title || 'No title detected'}</p>
            <p className="serp__desc">
              {page.metaDescription ?? 'No meta description — search engines would choose a snippet from page text.'}
            </p>
          </div>
          <Notice tone="info">
            Illustrative only. Actual search snippets are chosen by the search engine. Rankings, crawl status and
            backlinks require an SEO data provider (planned).
          </Notice>
        </section>
      }
    />
  )
}
