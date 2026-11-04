import type { CategoryResult, Check } from '../types/analysis'
import type { PageExtraction } from '../types/page'
import { makeCheck, scoreChecks, statusFromScore } from './analysis/scoring'
import { lowerFirst, plural } from '../utils/format'

/**
 * On-page SEO checks that can be evaluated deterministically from one page.
 * Future: a backend SEO provider (crawl, robots.txt, sitemap, rankings) can
 * add checks with the same Check shape without UI changes.
 */
export interface SeoProvider {
  analyse(page: PageExtraction): CategoryResult
}

const WHY = {
  title: 'The title tag is the headline shown in search results and browser tabs. Clear, descriptive titles of roughly 30–60 characters tend to display fully and earn more clicks.',
  meta: 'Search engines often use the meta description as the snippet under the result. Without one, they pick arbitrary page text, which usually converts worse.',
  h1: 'A single, descriptive H1 tells people and search engines what the page is about. Missing or multiple H1s dilute that signal.',
  structure: 'Logical H2/H3 sub-headings make content scannable and help search engines understand topic coverage.',
  canonical: 'A canonical tag tells search engines which URL is the preferred version, avoiding duplicate-content dilution from tracking parameters or mirrored pages.',
  og: 'Open Graph tags control how the page appears when shared on social platforms and messaging apps.',
  alt: 'Alt text describes images for screen readers and search engines. It is an accessibility requirement and an image-search opportunity.',
  internal: 'Internal links help visitors discover more pages and pass relevance between pages on the site.',
  external: 'Outbound links are neutral on their own; recorded here for context only.',
  schema: 'Structured data (schema.org JSON-LD) helps search engines and AI answer engines understand the business: what it is, where it is and how to contact it.',
  lang: 'The html lang attribute helps search engines and assistive technology identify the page language and region.',
  crawl: 'robots.txt and XML sitemaps affect how search engines crawl the site. Checking them safely requires a server-side request, planned as a future API capability.',
}

function titleCheck(page: PageExtraction): Check {
  const length = page.title.length
  if (!length) return makeCheck('seo-title', 'Title tag', 'not-detected', 'No page title detected.', WHY.title, 3)
  if (length < 15 || length > 65) {
    return makeCheck(
      'seo-title',
      'Title tag',
      'attention',
      `Title detected (${length} characters) — ${length < 15 ? 'shorter' : 'longer'} than the typical 15–65 character range.`,
      WHY.title,
      3,
    )
  }
  return makeCheck('seo-title', 'Title tag', 'good', `Title detected (${length} characters).`, WHY.title, 3)
}

function metaCheck(page: PageExtraction): Check {
  const length = page.metaDescription?.length ?? 0
  if (!length) {
    return makeCheck('seo-meta', 'Meta description', 'not-detected', 'Meta description is missing.', WHY.meta, 3)
  }
  if (length < 50 || length > 165) {
    return makeCheck(
      'seo-meta',
      'Meta description',
      'attention',
      `Meta description detected (${length} characters) — outside the typical 50–160 character range.`,
      WHY.meta,
      3,
    )
  }
  return makeCheck('seo-meta', 'Meta description', 'good', `Meta description detected (${length} characters).`, WHY.meta, 3)
}

function h1Check(page: PageExtraction): Check {
  const count = page.headings.h1.length
  if (count === 0) return makeCheck('seo-h1', 'H1 heading', 'not-detected', 'No H1 heading detected.', WHY.h1, 3)
  if (count > 1) {
    return makeCheck('seo-h1', 'H1 heading', 'attention', `${count} H1 headings detected — one is usually clearer.`, WHY.h1, 3)
  }
  return makeCheck('seo-h1', 'H1 heading', 'good', `H1 detected: "${page.headings.h1[0]}".`, WHY.h1, 3)
}

function structureCheck(page: PageExtraction): Check {
  const h2 = page.headings.h2.length
  const h3 = page.headings.h3.length
  const detail = `${plural(h2, 'H2')} and ${plural(h3, 'H3')} detected.`
  return makeCheck('seo-structure', 'Heading structure', h2 >= 2 ? 'good' : 'attention', detail, WHY.structure, 1)
}

function canonicalCheck(page: PageExtraction): Check {
  return page.canonical
    ? makeCheck('seo-canonical', 'Canonical URL', 'good', 'Canonical tag detected.', WHY.canonical, 2)
    : makeCheck('seo-canonical', 'Canonical URL', 'not-detected', 'No canonical tag detected.', WHY.canonical, 2)
}

export function openGraphCheck(page: PageExtraction, id = 'seo-og'): Check {
  const { title, description, image } = page.openGraph
  const present = [title && 'title', description && 'description', image && 'image'].filter(Boolean) as string[]
  if (present.length === 3) return makeCheck(id, 'Open Graph', 'good', 'Open Graph title, description and image detected.', WHY.og, 1)
  if (present.length === 0) return makeCheck(id, 'Open Graph', 'not-detected', 'No Open Graph tags detected.', WHY.og, 1)
  const missing = ['title', 'description', 'image'].filter((p) => !present.includes(p))
  return makeCheck(id, 'Open Graph', 'attention', `Open Graph partially set — missing ${missing.join(', ')}.`, WHY.og, 1)
}

export function altTextCheck(page: PageExtraction, id = 'seo-alt'): Check {
  const { total, missingAlt } = page.images
  if (total === 0) return makeCheck(id, 'Image alt text', 'unknown', 'No images detected on this page.', WHY.alt, 2)
  if (missingAlt === 0) return makeCheck(id, 'Image alt text', 'good', `All ${total} images have an alt attribute.`, WHY.alt, 2)
  return makeCheck(
    id,
    'Image alt text',
    missingAlt / total > 0.5 ? 'not-detected' : 'attention',
    `${missingAlt} of ${plural(total, 'image')} missing alt text.`,
    WHY.alt,
    2,
  )
}

function internalLinksCheck(page: PageExtraction): Check {
  const n = page.links.internal
  const status = n >= 10 ? 'good' : n > 0 ? 'attention' : 'not-detected'
  return makeCheck('seo-internal', 'Internal links', status, `${plural(n, 'internal link')} detected.`, WHY.internal, 1)
}

function schemaCheck(page: PageExtraction): Check {
  const { types } = page.schema
  return types.length
    ? makeCheck('seo-schema', 'Structured data', 'good', `Schema.org types detected: ${types.slice(0, 5).join(', ')}.`, WHY.schema, 2)
    : makeCheck('seo-schema', 'Structured data', 'not-detected', 'No schema.org JSON-LD detected.', WHY.schema, 2)
}

export const localSeoProvider: SeoProvider = {
  analyse(page) {
    const checks: Check[] = [
      titleCheck(page),
      metaCheck(page),
      h1Check(page),
      structureCheck(page),
      canonicalCheck(page),
      openGraphCheck(page),
      altTextCheck(page),
      internalLinksCheck(page),
      makeCheck('seo-external', 'External links', page.links.external ? 'good' : 'not-detected', `${plural(page.links.external, 'external link')} detected.`, WHY.external, 0),
      schemaCheck(page),
      makeCheck('seo-lang', 'Language attribute', page.lang ? 'good' : 'not-detected', page.lang ? `Language set to "${page.lang}".` : 'No html lang attribute detected.', WHY.lang, 1),
      makeCheck('seo-crawl', 'robots.txt & sitemap', 'unknown', 'Not checked — requires a server-side request (planned API capability).', WHY.crawl, 0),
    ]
    const score = scoreChecks(checks)
    const issues = checks.filter((c) => c.weight > 0 && (c.status === 'attention' || c.status === 'not-detected'))
    // Keep acronyms such as "H1" intact.
    const labels = issues.map((c) => (/^[A-Z][A-Z0-9]/.test(c.label) ? c.label : lowerFirst(c.label)))
    const summary =
      issues.length === 0
        ? 'Core on-page SEO elements were detected on this page.'
        : issues.length === 1
          ? `1 on-page check worth reviewing: ${labels[0]}.`
          : `${plural(issues.length, 'on-page check')} worth reviewing, including ${labels.slice(0, 2).join(' and ')}.`
    return { id: 'seo', label: 'SEO', status: statusFromScore(score, 80), score, summary, checks }
  },
}

export const seoService = {
  provider: localSeoProvider as SeoProvider,
  analyse(page: PageExtraction): CategoryResult {
    return this.provider.analyse(page)
  },
}
