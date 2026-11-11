import type { BusinessProfile, CategoryResult, Check, CheckStatus, Rating3, WebsiteProfile } from '../../types/analysis'
import { marketByCode } from '../../data/markets'
import type { PageExtraction } from '../../types/page'
import { listJoin, lowerFirst, plural } from '../../utils/format'
import { PRIMARY_CTA_INTENTS, SOCIAL_LABELS, SOCIAL_PLATFORMS } from '../../utils/signals'
import { altTextCheck, openGraphCheck } from '../seoService'
import { findCheck, makeCheck, needsAttention, scoreChecks, statusFromScore } from './scoring'

function primaryCtas(page: PageExtraction) {
  return page.ctas.filter((c) => PRIMARY_CTA_INTENTS.includes(c.intent))
}

function hasLeadForm(page: PageExtraction): boolean {
  return page.forms.count > 0 && !page.forms.searchOnly && page.forms.fieldCount > 0
}

/* ------------------------------------------------------------------ */
/* Website                                                             */
/* ------------------------------------------------------------------ */

const RATING_STATUS: Record<Rating3, CheckStatus> = { good: 'good', fair: 'attention', poor: 'attention', unknown: 'unknown' }

/** Website-sales checks derived from the website profile (speed, mobile, design, stack, freshness). */
function websiteProfileChecks(profile: WebsiteProfile): Check[] {
  const { speed, responsive, design, lastUpdated, outdatedTech, techStack, platform } = profile
  return [
    makeCheck('web-speed', 'Page speed', RATING_STATUS[speed.rating], speed.rating === 'unknown' ? 'Load timing was not available for this visit.' : `${speed.label} (measured in your browser on this visit).`,
      'Slow pages lose visitors before they see the offer, and page experience is a Google ranking signal. Core Web Vitals: main content should appear within 2.5 seconds.', 3),
    makeCheck('web-responsive', 'Responsive design', RATING_STATUS[responsive.rating], responsive.reasons.length ? `${responsive.label}: ${responsive.reasons.join('; ')}.` : `${responsive.label}: viewport, layout and text size look mobile-friendly.`,
      'Most visits to local business sites come from phones. A site that doesn’t adapt to small screens is harder to use and convert on.', 3),
    makeCheck('web-design', 'Design freshness', design.rating === 'modern' ? 'good' : 'attention', design.datedSignals.length ? `${design.rating === 'outdated' ? 'Outdated' : design.rating === 'dated' ? 'Dated' : 'Modern'} (${design.score}/100): ${design.datedSignals.join('; ')}.` : `Modern (${design.score}/100): ${design.modernSignals.slice(0, 3).join('; ') || 'no dated signals found'}.`,
      'Heuristic indicators of how current the build is (layout, images, fonts, legacy markup, library age). A dated look reduces trust; this is not a substitute for a visual design review.', 3),
    makeCheck('web-tech', 'Technology', outdatedTech.length ? 'attention' : techStack.length ? 'good' : 'unknown', outdatedTech.length ? `Outdated: ${listJoin(outdatedTech)}.` : platform ? `Built with ${platform}.` : techStack.length ? `Detected: ${techStack.slice(0, 4).map((t) => t.name).join(', ')}.` : 'Platform could not be identified from the page.',
      'Outdated platforms and libraries are harder to maintain, can carry security risks and often limit modern design and speed improvements.', 2),
    makeCheck('web-updated', 'Recently updated', lastUpdated.year === null ? 'unknown' : lastUpdated.stale ? 'attention' : 'good', `${lastUpdated.label}${lastUpdated.year ? ` (from ${lastUpdated.basis})` : ''}.`,
      'A site that hasn’t been touched in years often has stale content, old offers and outdated design. A visible current year signals an active business.', 2),
  ]
}

export function analyseWebsite(page: PageExtraction, profile: WebsiteProfile): CategoryResult {
  const viewportOk = /width\s*=\s*device-width/i.test(page.viewport ?? '')
  const ctas = primaryCtas(page)
  const hasContact = page.phones.length > 0 || page.emails.length > 0

  const checks: Check[] = [
    makeCheck('web-https', 'Secure connection (HTTPS)', page.protocol === 'https' ? 'good' : 'attention',
      page.protocol === 'https' ? 'Page is served over HTTPS.' : 'Page is not served over HTTPS.',
      'Browsers flag non-HTTPS pages as "Not secure", which erodes trust and can suppress conversions.', 3),
    makeCheck('web-viewport', 'Mobile viewport', viewportOk ? 'good' : page.viewport ? 'attention' : 'not-detected',
      viewportOk ? 'Responsive viewport meta tag detected.' : page.viewport ? `Viewport set to "${page.viewport}".` : 'No mobile viewport meta tag detected.',
      'Without a responsive viewport, mobile browsers render a zoomed-out desktop page. Most local search traffic is mobile.', 2),
    makeCheck('web-title', 'Page title', page.title ? 'good' : 'not-detected',
      page.title ? `"${page.title}"` : 'No page title detected.',
      'The title is the first impression in search results, bookmarks and browser tabs.', 2),
    makeCheck('web-meta', 'Meta description', page.metaDescription ? 'good' : 'not-detected',
      page.metaDescription ? 'Meta description detected.' : 'Meta description is missing.',
      'The meta description is the page "pitch" shown under search results.', 1),
    makeCheck('web-headings', 'Headings', page.headings.h1.length ? 'good' : 'attention',
      `${plural(page.headings.h1.length, 'H1')}, ${plural(page.headings.h2.length, 'H2')}, ${plural(page.headings.h3.length, 'H3')} detected.`,
      'Clear headings help visitors understand the offer within seconds.', 2),
    { ...altTextCheck(page, 'web-alt'), label: 'Images & alt text', weight: 1 },
    makeCheck('web-forms', 'Forms', hasLeadForm(page) ? 'good' : page.forms.count ? 'attention' : 'not-detected',
      hasLeadForm(page) ? `${plural(page.forms.count, 'form')} detected.` : page.forms.count ? 'Only a search form detected.' : 'No forms detected on this page.',
      'Forms let visitors convert outside business hours without picking up the phone.', 1),
    makeCheck('web-cta', 'Primary call-to-action', ctas.length ? 'good' : 'not-detected',
      ctas.length ? `Detected: ${listJoin(ctas.slice(0, 3).map((c) => `"${c.text}"`))}.` : 'No clear primary call-to-action detected.',
      'A visible primary action (book, call, enquire, shop) tells visitors what to do next.', 2),
    makeCheck('web-contact', 'Contact information', hasContact ? 'good' : 'not-detected',
      hasContact ? `${plural(page.phones.length, 'phone number')} and ${plural(page.emails.length, 'email address', 'email addresses')} detected.` : 'No phone number or email detected on this page.',
      'Visible contact details build trust and give high-intent visitors a direct path.', 2),
    makeCheck('web-social', 'Social links', page.socialLinks.length ? 'good' : 'not-detected',
      page.socialLinks.length ? `${plural(page.socialLinks.length, 'platform')} linked.` : 'No social profile links detected on this page.',
      'Social links connect website visitors to ongoing brand content and proof.', 1),
    { ...openGraphCheck(page, 'web-og'), weight: 1 },
    makeCheck('web-content', 'Content depth', page.wordCount >= 300 ? 'good' : 'attention',
      `Approximately ${page.wordCount.toLocaleString('en-AU')} words of visible text.`,
      'Very thin pages give visitors and search engines little to evaluate the business on.', 1),
    ...websiteProfileChecks(profile),
  ]

  const score = scoreChecks(checks)
  const foundationsOk = ['web-https', 'web-viewport', 'web-title'].every(
    (id) => findCheck(checks, id)?.status === 'good',
  )
  const ctaGap = needsAttention(findCheck(checks, 'web-cta'))
  const contactGap = needsAttention(findCheck(checks, 'web-contact'))

  let summary = foundationsOk ? 'Strong basic website structure' : 'Some foundational website elements need attention'
  if (ctaGap) summary += ', but the primary conversion action is not immediately visible.'
  else if (contactGap) summary += ', but contact details were not detected on this page.'
  else summary += foundationsOk ? ', with calls-to-action and contact details present.' : '.'

  if (profile.rebuildFit !== 'low') {
    summary += ` Website upgrade opportunity: ${profile.rebuildFit} (${listJoin(profile.rebuildReasons)}).`
  }

  // A strong rebuild case outweighs passing basics (HTTPS, title, contact details).
  const status = profile.rebuildFit === 'strong' ? 'attention' : statusFromScore(score, 75)
  return { id: 'website', label: 'Website', status, score, summary, checks }
}

/* ------------------------------------------------------------------ */
/* Conversion                                                          */
/* ------------------------------------------------------------------ */

export function analyseConversion(page: PageExtraction): CategoryResult {
  const primary = primaryCtas(page)
  const learnOnly = page.ctas.length > 0 && primary.length === 0
  const aboveFold = primary.filter((c) => c.aboveFold)
  const highIntent = page.ctas.filter((c) => ['book', 'quote', 'enquire', 'shop'].includes(c.intent))

  const checks: Check[] = [
    makeCheck('conv-cta', 'Primary CTA', primary.length ? 'good' : learnOnly ? 'attention' : 'not-detected',
      primary.length
        ? `${plural(primary.length, 'primary CTA')} detected: ${listJoin(primary.slice(0, 4).map((c) => `"${c.text}"`))}.`
        : learnOnly ? 'Only soft CTAs (e.g. "Learn more") detected.' : 'No clear primary CTA detected.',
      'A strong, specific call-to-action is the single biggest lever on conversion rate.', 3),
    makeCheck('conv-fold', 'CTA above the fold', aboveFold.length ? 'good' : primary.length ? 'attention' : 'not-detected',
      aboveFold.length
        ? `"${aboveFold[0].text}" is visible without scrolling.`
        : primary.length ? 'Primary CTAs exist but none were visible in the first screen.' : 'No primary CTA detected above the fold.',
      'Many visitors decide within the first screen. A visible action there captures intent before they scroll away.', 2),
    makeCheck('conv-phone', 'Phone number', page.phones.length ? 'good' : 'not-detected',
      page.phones.length ? `Detected: ${page.phones.slice(0, 2).join(', ')}.` : 'No phone number detected on this page.',
      'For service businesses, phone calls are often the highest-value conversion.', 2),
    makeCheck('conv-email', 'Email address', page.emails.length ? 'good' : 'not-detected',
      page.emails.length ? `Detected: ${page.emails.slice(0, 2).join(', ')}.` : 'No email address detected on this page.',
      'Email is a low-friction option for visitors not ready to call.', 1),
    makeCheck('conv-form', 'Enquiry / lead form', hasLeadForm(page) ? 'good' : page.forms.count ? 'attention' : 'not-detected',
      hasLeadForm(page)
        ? `${plural(page.forms.count, 'form')} with ${plural(page.forms.fieldCount, 'field')}${page.forms.hasEmailField ? ', including an email field' : ''}.`
        : page.forms.count ? 'Only a search form detected.' : 'No forms detected on this page.',
      'A form captures leads 24/7 and creates a measurable conversion event for advertising.', 2),
    makeCheck('conv-intent', 'High-intent action', highIntent.length ? 'good' : 'not-detected',
      highIntent.length
        ? `Book / quote / enquire / shop actions detected: ${listJoin(highIntent.slice(0, 3).map((c) => `"${c.text}"`))}.`
        : 'No booking, quote, enquiry or shop action detected.',
      'Specific actions such as "Book now" or "Get a quote" convert better than generic ones.', 1),
  ]

  const score = scoreChecks(checks)
  const hasContact = page.phones.length > 0 || page.emails.length > 0
  let summary: string
  const missingPaths = [
    !page.phones.length && 'phone number',
    !page.emails.length && 'email address',
    !hasLeadForm(page) && 'enquiry form',
  ].filter((m): m is string => Boolean(m))
  if (primary.length && aboveFold.length) {
    summary = missingPaths.length
      ? `A call-to-action is visible in the first screen, but no ${listJoin(missingPaths).replace(/ and /, ' or ')} was detected on this page.`
      : 'Clear conversion paths detected, including a call-to-action in the first screen.'
  } else if (primary.length) summary = 'Calls-to-action were detected, but none were visible in the first screen.'
  else if (hasContact) summary = 'Contact information is present, but no clear primary CTA was detected.'
  else summary = 'No clear conversion path (CTA, phone or email) was detected on this page.'

  return { id: 'conversion', label: 'Conversion', status: statusFromScore(score, 75), score, summary, checks }
}

/* ------------------------------------------------------------------ */
/* Social                                                              */
/* ------------------------------------------------------------------ */

export function analyseSocial(page: PageExtraction): CategoryResult {
  const checks: Check[] = SOCIAL_PLATFORMS.map((platform) => {
    const link = page.socialLinks.find((s) => s.platform === platform)
    return makeCheck(
      `social-${platform}`,
      SOCIAL_LABELS[platform],
      link ? 'good' : 'not-detected',
      link ? link.url : 'Not detected on this page.',
      'A missing link does not mean the business has no account — only that this page does not link to one.',
      0,
    )
  })
  const found = page.socialLinks.map((s) => SOCIAL_LABELS[s.platform])
  const summary = found.length
    ? `${listJoin(found)} ${found.length === 1 ? 'link' : 'links'} detected.`
    : 'No social profile links detected on this page. Accounts may still exist.'
  return {
    id: 'social',
    label: 'Social',
    status: found.length ? 'detected' : 'limited',
    score: null,
    summary,
    checks,
  }
}

/* ------------------------------------------------------------------ */
/* Advertising                                                         */
/* ------------------------------------------------------------------ */

const TAG_LABELS: [keyof PageExtraction['tracking'], string, string][] = [
  ['googleAds', 'Google Ads tag', 'Indicates Google Ads conversion tracking or remarketing is configured. It does not confirm active campaigns or spend.'],
  ['metaPixel', 'Meta Pixel', 'Indicates Facebook/Instagram ad tracking is configured. It does not confirm active campaigns or spend.'],
  ['googleTagManager', 'Google Tag Manager', 'A tag container. Other advertising tags may load through it and will not be visible here.'],
  ['googleAnalytics', 'Google Analytics', 'Indicates website analytics are in place, which is a prerequisite for measuring campaigns.'],
  ['linkedInInsight', 'LinkedIn Insight Tag', 'Indicates LinkedIn ad tracking is configured.'],
  ['tiktokPixel', 'TikTok Pixel', 'Indicates TikTok ad tracking is configured.'],
]

export function analyseAdvertising(page: PageExtraction): CategoryResult {
  const checks: Check[] = TAG_LABELS.map(([key, label, why]) =>
    makeCheck(
      `ads-${key}`,
      label,
      page.tracking[key] ? 'good' : 'not-detected',
      page.tracking[key] ? `${label} detected in page scripts.` : 'Not detected on this page.',
      why,
      0,
    ),
  )
  checks.push(
    makeCheck('ads-activity', 'Ad spend & results', 'unknown',
      'Ad spend, clicks and results are not public.',
      'Tags only show tracking is set up. Public ad libraries show how many ads are running, but not what they cost or achieve.', 0),
  )
  const adTags = TAG_LABELS.filter(([key]) => ['googleAds', 'metaPixel', 'linkedInInsight', 'tiktokPixel'].includes(key) && page.tracking[key])
  const summary = adTags.length
    ? `${listJoin(adTags.map(([, label]) => label))} detected, so ad tracking is set up on the website.`
    : 'No advertising tags detected on this page. They may load later through Google Tag Manager or after cookie consent.'
  return {
    id: 'advertising',
    label: 'Advertising',
    status: adTags.length ? 'detected' : 'limited',
    score: null,
    summary,
    checks,
  }
}

/* ------------------------------------------------------------------ */
/* Local                                                               */
/* ------------------------------------------------------------------ */

const LOCAL_SCHEMA = /(LocalBusiness|Dentist|Restaurant|Store|MedicalClinic|Physician|ExerciseGym|BeautySalon|HairSalon|Plumber|Electrician|AutoRepair|RealEstateAgent|LegalService|AccountingService)/

export function analyseLocal(page: PageExtraction, business: BusinessProfile): CategoryResult {
  const localSchema = page.schema.types.find((t) => LOCAL_SCHEMA.test(t))
  // Domain ending or html lang region matching the business's country (Australia when unknown).
  const market = marketByCode(business.country?.code ?? 'AU')!
  const langRegion = (page.lang ?? '').split(/[-_]/)[1]?.toUpperCase()
  const regional = market.tlds.test(page.domain) || langRegion === market.code
  const regionalDomain = market.tlds.source.replace(/[\\$]/g, '') // "\.au$" → ".au"
  const hasAddress = Boolean(page.schema.streetAddress) || page.addressCandidates.length > 0

  const checks: Check[] = [
    makeCheck('local-location', 'Business location', business.location ? 'good' : 'not-detected',
      business.location ? `${business.location.label} (${lowerFirst(business.location.basis)}).` : 'No location detected on this page.',
      'Local search and local advertising both depend on a clearly stated service area or address.', 3),
    makeCheck('local-address', 'Street address', hasAddress ? 'good' : 'not-detected',
      hasAddress ? (page.schema.streetAddress ?? page.addressCandidates[0]) : 'No street address detected on this page.',
      'A consistent name, address and phone (NAP) across the web supports local search rankings.', 2),
    makeCheck('local-phone', 'Local phone number', page.phones.length ? 'good' : 'not-detected',
      page.phones.length ? page.phones[0] : 'No phone number detected on this page.',
      'A local phone number is a key NAP element and a direct conversion path.', 2),
    makeCheck('local-schema', 'Local business schema', localSchema ? 'good' : 'not-detected',
      localSchema ? `Schema type "${localSchema}" detected.` : 'No LocalBusiness-type schema detected.',
      'LocalBusiness schema states address, hours and contact details in a machine-readable way.', 2),
    makeCheck('local-market', `${market.name} market signal`, regional ? 'good' : 'attention',
      regional
        ? `${market.name} domain or en-${market.code} language detected.`
        : `No ${regionalDomain} domain or en-${market.code} language attribute detected.`,
      `Regional signals help search engines match the site to searches in ${market.name}.`, 1),
    makeCheck('local-gbp', 'Google Business Profile', 'unknown',
      'Requires further research — not visible from the website alone.',
      'Profile completeness, reviews and map-pack visibility need Google Business Profile data (planned API capability).', 0),
    makeCheck('local-reviews', 'Reviews & ratings', 'unknown',
      'Requires further research.',
      'Review volume and rating are strong local trust signals, available via review platform APIs later.', 0),
  ]

  const score = scoreChecks(checks)
  const summary = business.location
    ? `Location detected: ${business.location.label}. Google Business Profile and reviews require further research.`
    : 'No business location was detected on this page. This does not mean the business has no physical presence.'
  return { id: 'local', label: 'Local', status: statusFromScore(score, 75), score, summary, checks }
}
