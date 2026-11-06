import type { AiGap, Rating3, WebsiteProfile } from '../../types/analysis'
import type { PageExtraction, TechItem } from '../../types/page'
import { listJoin } from '../../utils/format'

/**
 * Website-sales profile. All ratings are rule-based from page signals:
 * - Speed: Core Web Vitals thresholds (LCP ≤ 2.5s good, ≤ 4s needs work; CLS > 0.25 poor),
 *   falling back to full load time (≤ 3s / ≤ 6s) when LCP isn't available.
 * - Design freshness: heuristic indicators (modern images, layout, fonts vs. legacy markup,
 *   outdated libraries, stale copyright). It is not a visual design review.
 */

const PLATFORM_PRIORITY = [
  'Shopify',
  'Wix',
  'Squarespace',
  'Webflow',
  'Framer',
  'GoDaddy Website Builder',
  'Duda',
  'Weebly',
  'BigCommerce',
  'Magento',
  'WordPress',
  'Joomla',
  'Drupal',
  'Ghost',
  'HubSpot CMS',
  'Next.js',
  'Nuxt',
  'Gatsby',
  'Angular',
  'Vue',
  'Svelte',
]

function techLabel(t: TechItem): string {
  return t.version ? `${t.name} ${t.version}` : t.name
}

function platformOf(stack: TechItem[]): string | null {
  const primary = PLATFORM_PRIORITY.map((name) => stack.find((t) => t.name === name)).find(Boolean)
  if (!primary) return null
  const addOns = stack.filter((t) => ['Elementor', 'Divi', 'WooCommerce'].includes(t.name)).map((t) => t.name)
  return addOns.length ? `${techLabel(primary)} + ${addOns.join(' + ')}` : techLabel(primary)
}

const seconds = (ms: number) => `${(ms / 1000).toFixed(1)}s`

function speedOf(page: PageExtraction): WebsiteProfile['speed'] {
  const { lcpMs, loadMs, cls, pageWeightKb } = page.performance
  let rating: Rating3 = 'unknown'
  if (lcpMs !== null) rating = lcpMs <= 2500 ? 'good' : lcpMs <= 4000 ? 'fair' : 'poor'
  else if (loadMs !== null) rating = loadMs <= 3000 ? 'good' : loadMs <= 6000 ? 'fair' : 'poor'
  if (cls !== null && cls > 0.25 && rating === 'good') rating = 'fair'
  else if (cls !== null && cls > 0.25 && rating === 'fair') rating = 'poor'

  const parts = [lcpMs !== null && `main content in ${seconds(lcpMs)}`, loadMs !== null && `fully loaded in ${seconds(loadMs)}`].filter(Boolean)
  const word = { good: 'Fast', fair: 'Average', poor: 'Slow', unknown: 'Not measured' }[rating]
  return { rating, label: parts.length ? `${word} — ${parts.join(', ')}` : word, loadMs, lcpMs, cls, pageWeightKb }
}

function responsiveOf(page: PageExtraction): WebsiteProfile['responsive'] {
  const viewportOk = /width\s*=\s*device-width/i.test(page.viewport ?? '')
  const { horizontalOverflow, mediaQueries, usesFlexOrGrid, baseFontPx } = page.design
  const reasons: string[] = []
  if (!viewportOk) reasons.push('No mobile viewport setting')
  if (horizontalOverflow) reasons.push('Content overflows the screen width (sideways scrolling)')
  if (mediaQueries === 0 && !usesFlexOrGrid) reasons.push('No responsive layout rules detected')
  if (baseFontPx !== null && baseFontPx < 14) reasons.push(`Small body text (${baseFontPx}px)`)

  let rating: Rating3
  if (!viewportOk) rating = 'poor'
  else if (horizontalOverflow || (mediaQueries === 0 && !usesFlexOrGrid)) rating = 'fair'
  else rating = 'good'
  const label = { good: 'Mobile-ready', fair: 'Partly responsive', poor: 'Not mobile-friendly', unknown: 'Unknown' }[rating]
  return { rating, label, reasons }
}

/** Customer details (hours, area, reviews) the page doesn't show; empty when not checked. */
export function missingCustomerDetails(page: PageExtraction): string[] {
  const s = page.aiSignals
  if (!s) return []
  return ([['opening hours', s.openingHours], ['service area', s.serviceArea], ['reviews', s.reviews]] as const)
    .filter(([, found]) => !found)
    .map(([name]) => name)
}

/**
 * How easily AI answer engines (ChatGPT, Google AI Overviews, Perplexity) can
 * understand the business from this page: page signals, plus the site's
 * robots.txt rules for AI crawlers and the text present before JavaScript runs.
 */
function aiFriendlyOf(page: PageExtraction): NonNullable<WebsiteProfile['aiFriendly']> {
  const { schema, headings, aiSignals: ai } = page
  const present: string[] = []
  const missing: string[] = []
  const gaps: AiGap[] = []
  let points = 0
  let possible = 0
  // `ok` is null when a signal couldn't be checked (older analyses, failed
  // requests); it then counts neither way.
  const check = (ok: boolean | null, weight: number, id: AiGap, good: string, gap: string) => {
    if (ok === null) return
    possible += weight
    if (ok) {
      points += weight
      present.push(good)
    } else {
      missing.push(gap)
      gaps.push(id)
    }
  }
  // Older analyses predate questionCount; fall back to question headings.
  const questions = page.questionCount ?? [...headings.h2, ...headings.h3].filter((h) => h.trim().endsWith('?')).length
  const blocked = ai?.robots.blockedCrawlers ?? []
  const missingDetails = missingCustomerDetails(page)

  // Highest weight first, so the detail line leads with what matters most.
  check(ai && ai.robots.status !== 'unavailable' ? blocked.length === 0 : null, 3, 'ai-blocked', 'AI tools allowed to read the site', `Blocks AI tools (${listJoin(blocked)})`)
  check(schema.blockCount > 0, 3, 'schema', 'Structured data (schema.org)', 'No structured data')
  check(Boolean(schema.name && (schema.telephone || schema.streetAddress || schema.locality)), 2, 'business-schema', 'Business details in structured data', 'Business details not in structured data')
  check(schema.types.includes('FAQPage') || questions >= 2, 2, 'faq', 'Question-and-answer content', 'No question-and-answer content')
  check(page.wordCount >= 300, 2, 'text', 'Enough text to explain the business', 'Little text for AI to read')
  // Only meaningful when the browser shows a fair amount of text.
  check(ai && ai.rawWordCount !== null && page.wordCount >= 150 ? ai.rawWordCount >= page.wordCount * 0.5 : null, 2, 'js-only', 'Text readable without JavaScript', 'Text only appears after JavaScript runs')
  check(ai ? missingDetails.length <= 1 : null, 2, 'customer-info', 'Hours, area or reviews shown', `No ${listJoin(missingDetails, 'or')} shown`)
  check(page.title.length >= 10 && Boolean(page.metaDescription), 1, 'title-description', 'Descriptive title and description', 'Missing page title or description')
  check(headings.h1.length === 1, 1, 'h1', 'One clear main heading', headings.h1.length ? 'More than one main heading' : 'No main heading')
  check(headings.h2.length >= 2, 1, 'sections', 'Organised into sections', 'Not organised into sections')

  // Same thresholds as the original 7 checks (9 and 5 of 12 points).
  const share = possible ? points / possible : 0
  let rating: Rating3 = share >= 0.75 ? 'good' : share >= 5 / 12 ? 'fair' : 'poor'
  // A site that blocks AI tools can't be called AI friendly, whatever else it does.
  if (blocked.length && rating === 'good') rating = 'fair'
  const label = { good: 'AI friendly', fair: 'Partly AI friendly', poor: 'Not AI friendly', unknown: 'Unknown' }[rating]
  return { rating, label, present, missing, gaps }
}

function lastUpdatedOf(page: PageExtraction): WebsiteProfile['lastUpdated'] {
  const year = new Date().getFullYear()
  const candidates: { year: number; basis: string }[] = []
  const { modifiedMeta, serverLastModified, copyrightYear } = page.freshness
  for (const [value, basis] of [
    [modifiedMeta, 'page modified date'],
    [serverLastModified, 'server last-modified date'],
  ] as const) {
    const t = value ? Date.parse(value) : Number.NaN
    if (Number.isFinite(t)) candidates.push({ year: new Date(t).getFullYear(), basis })
  }
  if (copyrightYear) candidates.push({ year: copyrightYear, basis: 'copyright notice' })
  if (!candidates.length) return { year: null, label: 'No update date found on the page', basis: 'none', stale: false }
  const latest = candidates.sort((a, b) => b.year - a.year)[0]
  const age = year - latest.year
  return {
    year: latest.year,
    label: age <= 0 ? `${latest.year} (current)` : `${latest.year} — about ${age} year${age === 1 ? '' : 's'} ago`,
    basis: latest.basis,
    stale: age >= 2,
  }
}

function designOf(page: PageExtraction, outdatedTech: string[], stale: boolean): WebsiteProfile['design'] {
  const d = page.design
  const modern: string[] = []
  const dated: string[] = []
  const severity = new Map<string, number>()
  let score = 70
  const signal = (when: boolean, delta: number, list: string[], text: string) => {
    if (!when) return
    score += delta
    list.push(text)
    severity.set(text, delta)
  }


  signal(d.modernImages > 0, 8, modern, 'Modern image formats (WebP/AVIF)')
  signal(d.lazyImages > 0, 4, modern, 'Lazy-loaded images')
  signal(d.webFonts.length > 0, 5, modern, `Custom web fonts (${d.webFonts.slice(0, 2).join(', ')})`)
  signal(d.usesFlexOrGrid, 8, modern, 'Modern flexible layout (Flexbox/Grid)')
  signal(d.svgCount > 2, 3, modern, 'Crisp SVG icons/graphics')
  signal((d.mediaQueries ?? 0) > 0, 4, modern, 'Responsive breakpoints')

  signal(!/width\s*=\s*device-width/i.test(page.viewport ?? ''), -20, dated, 'Not set up for mobile screens')
  signal(d.flash, -20, dated, 'Uses Flash (no longer supported by browsers)')
  signal(d.legacyTags > 0, -15, dated, 'Old HTML tags (e.g. <font>, <center>)')
  signal(d.layoutTables > 0, -15, dated, 'Table-based page layout')
  signal(d.horizontalOverflow, -10, dated, 'Content wider than the screen')
  signal(d.baseFontPx !== null && d.baseFontPx < 14, -5, dated, 'Small body text')
  signal(page.images.total > 5 && d.modernImages === 0, -5, dated, 'No modern image formats')
  signal(outdatedTech.length > 0, -Math.min(20, outdatedTech.length * 10), dated, `Outdated technology (${listJoin(outdatedTech)})`)
  signal(stale, -10, dated, 'No sign of recent updates')

  score = Math.max(0, Math.min(100, score))
  // Most damaging signals first, so summaries lead with what matters.
  dated.sort((x, y) => (severity.get(x) ?? 0) - (severity.get(y) ?? 0))
  return { rating: score >= 75 ? 'modern' : score >= 55 ? 'dated' : 'outdated', score, modernSignals: modern, datedSignals: dated }
}

export function buildWebsiteProfile(page: PageExtraction): WebsiteProfile {
  const techStack = page.tech
  const outdatedTech = techStack.filter((t) => t.outdated).map(techLabel)
  const speed = speedOf(page)
  const responsive = responsiveOf(page)
  const lastUpdated = lastUpdatedOf(page)
  const design = designOf(page, outdatedTech, lastUpdated.stale)

  const reasons: string[] = []
  let points = 0
  const add = (weight: number, reason: string) => {
    points += weight
    reasons.push(reason)
  }
  if (design.rating === 'outdated') add(3, 'has an outdated design')
  else if (design.rating === 'dated') add(1, 'has a design showing signs of age')
  if (responsive.rating === 'poor') add(3, 'isn’t mobile-friendly')
  else if (responsive.rating === 'fair') add(1, 'is only partly responsive on mobile')
  if (speed.rating === 'poor') add(2, 'is slow to load')
  else if (speed.rating === 'fair') add(1, 'loads at only average speed')
  if (outdatedTech.length) add(Math.min(2, outdatedTech.length), `runs outdated software (${outdatedTech[0]}${outdatedTech.length > 1 ? ` and ${outdatedTech.length - 1} more` : ''})`)
  if (lastUpdated.stale) add(2, `shows no sign of updates since ${lastUpdated.year}`)

  return {
    platform: platformOf(techStack),
    techStack,
    outdatedTech,
    speed,
    responsive,
    aiFriendly: aiFriendlyOf(page),
    design,
    lastUpdated,
    rebuildFit: points >= 4 ? 'strong' : points >= 2 ? 'moderate' : 'low',
    rebuildReasons: reasons,
  }
}
