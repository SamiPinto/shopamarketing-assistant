import type { AiGap, CategoryId, CategoryStatus, Check, MarketingAnalysis } from '../types/analysis'
import type { ClientImprovement, ClientReport, ComparisonRow, GlanceItem, GlanceStatus } from '../types/clientReport'
import type { WebsiteIntel } from '../types/intel'
import type { KeywordReport } from '../types/keywords'
import { pageOf } from './keywordService'
import { formatDate, listJoin, plural } from '../utils/format'
import { AI_CRAWLERS, PRIMARY_CTA_INTENTS, SOCIAL_LABELS } from '../utils/signals'
import { hasPhysicalFootprint } from './analysis/business'
import { missingCustomerDetails } from './analysis/websiteProfile'
import { FEATURES } from '../config/features'
import { findCheck } from './analysis/scoring'
import { buildWebsiteFacts } from './websiteFacts'

/**
 * Builds the client-facing "Website Opportunity Snapshot": 3–5 prioritised
 * improvements written in plain language, each with a talking point for the
 * salesperson. Every "found" item is backed by page evidence; anything not
 * evidenced is labelled a growth idea. No figures or outcomes are promised.
 */

type Copy = Omit<ClientImprovement, 'id' | 'found' | 'kind'> & {
  /** Sales value used to rank improvements (higher = mention first). */
  impact: number
}

type CopyFactory = (a: MarketingAnalysis, check: Check | undefined) => Copy

const firstPrimaryCta = (a: MarketingAnalysis) =>
  a.page.ctas.find((c) => PRIMARY_CTA_INTENTS.includes(c.intent))?.text

const IMPROVEMENTS: Record<string, CopyFactory> = {
  // Website-build items rank highest: website projects are the primary offer.
  'web-design': (a) => ({
    impact: 12,
    title: a.website.design.rating === 'outdated' ? 'Modernise an outdated website design' : 'Refresh a website design that’s showing its age',
    whyItMatters:
      'Customers judge a business by its website in seconds. A dated look erodes trust and sends people to competitors whose sites feel more current.',
    howShopaHelps: 'Design and build a modern, mobile-first website that reflects the quality of the business and guides visitors to enquire.',
    service: 'Website design & build',
    talkingPoint:
      a.website.design.rating === 'outdated'
        ? 'Your website’s design and build look a few generations old. A modern rebuild would make a much stronger first impression — and that’s our specialty.'
        : 'Your site works, but parts of the design are starting to show their age. A refresh would bring it in line with what customers now expect.',
  }),
  'web-speed': (a) => ({
    impact: 11,
    title: 'Make the website load faster',
    whyItMatters:
      'Visitors abandon slow pages, especially on mobile, and Google uses page experience as a ranking signal. Every second counts.',
    howShopaHelps: 'Optimise images, code and hosting — or rebuild on a faster platform — to hit Google’s Core Web Vitals targets.',
    service: 'Website performance',
    talkingPoint:
      a.website.speed.lcpMs !== null
        ? `On our test your homepage took ${(a.website.speed.lcpMs / 1000).toFixed(1)} seconds to show its main content — Google recommends under 2.5. A faster site keeps more of the people you’re already paying to attract.`
        : 'Your homepage is slow to load. A faster site keeps more of the visitors you already have.',
  }),
  'web-responsive': (a) => ({
    impact: 10,
    title: 'Make the website work properly on phones',
    whyItMatters: 'Most people will find you on their phone. If the site is hard to read or scroll on mobile, they leave.',
    howShopaHelps: 'Rebuild the layout mobile-first so every page adapts cleanly to any screen size.',
    service: 'Website design & build',
    talkingPoint: `On mobile your site ${a.website.responsive.reasons[0] ? `has issues — ${a.website.responsive.reasons[0].toLowerCase()}` : 'doesn’t fully adapt to the screen'}. Since most of your customers browse on phones, this is one of the biggest wins available.`,
  }),
  'web-tech': (a) => ({
    impact: 9,
    title: 'Upgrade outdated website technology',
    whyItMatters: 'Old software versions are harder to maintain, can carry security risks and hold back speed and design improvements.',
    howShopaHelps: 'Upgrade or migrate the site to a current, secure platform with ongoing care.',
    service: 'Website build & care',
    talkingPoint: `Your site is running older technology (${listJoin(a.website.outdatedTech)}). Bringing it up to date improves security and makes future changes faster and cheaper.`,
  }),
  'web-updated': (a) => ({
    impact: 8,
    title: 'Show customers you’re active and current',
    whyItMatters: 'An old date or stale content can make customers wonder if the business is still operating, or if offers are still valid.',
    howShopaHelps: 'Refresh the content and design, and set up a simple way to keep the site current.',
    service: 'Website & content',
    talkingPoint: `The newest date we could find on your site is ${a.website.lastUpdated.year}. A refresh signals to customers that you’re active and up to date.`,
  }),
  'conv-cta': () => ({
    impact: 10,
    title: 'Give visitors one clear next step',
    whyItMatters:
      'When visitors can’t immediately see how to book, call or enquire, many leave without acting — even when they were ready to buy.',
    howShopaHelps: 'Design a prominent call-to-action such as “Book now” or “Get a quote”, and place it where it gets seen.',
    service: 'Website & conversion',
    talkingPoint:
      'Right now there isn’t one obvious next step on your homepage. Making “Book now” or “Get a quote” the hero action is often one of the quickest wins.',
  }),
  'web-https': () => ({
    impact: 10,
    title: 'Secure the website',
    whyItMatters: 'Browsers label non-secure sites “Not secure”, which puts customers off before they read a word.',
    howShopaHelps: 'Set up and enforce HTTPS across the whole site.',
    service: 'Website',
    talkingPoint: 'Your site shows as “Not secure” in browsers. It’s a simple fix and an important trust signal.',
  }),
  'web-viewport': () => ({
    impact: 9,
    title: 'Make the site properly mobile-friendly',
    whyItMatters: 'Many customers search on their phones. Without a mobile setup, pages can look zoomed-out and be hard to use.',
    howShopaHelps: 'Review and fix the mobile experience so every page adapts to any screen.',
    service: 'Website',
    talkingPoint: 'Your homepage isn’t set up for mobile screens — and a lot of your customers are likely browsing on their phones.',
  }),
  'conv-fold': (a) => {
    const cta = firstPrimaryCta(a)
    return {
      impact: 8,
      title: 'Move your main button into the first screen',
      whyItMatters:
        'Visitors decide quickly whether to act. If the main button only appears after scrolling, ready-to-buy visitors can miss it.',
      howShopaHelps: 'Restructure the top of the homepage so the main action is visible straight away on mobile and desktop.',
      service: 'Website & conversion',
      talkingPoint: cta
        ? `Your “${cta}” button is there, but people have to scroll to find it. Bringing it into the first screen makes it much easier to act.`
        : 'Your main call-to-action only appears after scrolling. Bringing it into the first screen makes it much easier to act.',
    }
  },
  'seo-meta': () => ({
    impact: 7,
    title: 'Write a compelling Google search description',
    whyItMatters:
      'This is the text under your link in Google. Without a good one, Google picks text itself — a well-written description can earn more clicks.',
    howShopaHelps: 'Write search-optimised titles and descriptions for your key pages.',
    service: 'SEO',
    talkingPoint:
      'Google is choosing what to show under your listing because the homepage has no proper search description. Writing one helps you stand out in results.',
  }),
  'conv-form': () => ({
    impact: 7,
    title: 'Capture enquiries 24/7 with a simple form',
    whyItMatters:
      'Not everyone wants to call. A short form lets people reach you after hours and gives you a measurable lead source.',
    howShopaHelps: 'Add a short, mobile-friendly enquiry form with lead tracking.',
    service: 'Website & conversion',
    talkingPoint:
      'There’s no enquiry form on the homepage, so after-hours visitors have no easy way to reach you. A short form turns them into leads you can follow up.',
  }),
  'conv-phone': () => ({
    impact: 7,
    title: 'Make your phone number easy to find and tap',
    whyItMatters: 'For many businesses a phone call is the most valuable enquiry. A tap-to-call number removes friction on mobile.',
    howShopaHelps: 'Add a visible, click-to-call number in the header and on key pages.',
    service: 'Website & conversion',
    talkingPoint: 'We couldn’t find a phone number on the homepage. A tap-to-call number at the top helps mobile visitors contact you straight away.',
  }),
  'seo-title': (_a, check) => ({
    impact: 6,
    title: 'Sharpen your page title for Google',
    whyItMatters: 'The page title is the headline people see in Google. Clear titles that mention your main service and location tend to get clicked.',
    howShopaHelps: 'Rewrite page titles around your key services and locations.',
    service: 'SEO',
    talkingPoint:
      check?.status === 'not-detected'
        ? 'Your homepage has no page title, which is the headline Google shows. Adding one is a quick SEO win.'
        : 'Your page title is outside the ideal length. Tightening it around your main service and location helps you get found and clicked.',
  }),
  'seo-h1': (a) => ({
    impact: 6,
    title: 'Clarify the main headline on your homepage',
    whyItMatters: 'One clear main heading tells visitors — and Google — exactly what you do within seconds.',
    howShopaHelps: 'Restructure headings around your key services and location.',
    service: 'SEO',
    talkingPoint: a.page.headings.h1.length
      ? `Your homepage has ${a.page.headings.h1.length} main headings, which muddies the message for both people and Google.`
      : 'Your homepage has no main heading, so people and Google have to work out what you do.',
  }),
  'local-location': () => ({
    impact: 6,
    title: 'Make your location and service area clear',
    whyItMatters: 'Customers searching “near me” need to know where you are. A clearly stated location supports local search visibility.',
    howShopaHelps: 'Add clear location and service-area information, aligned with your Google Business Profile.',
    service: 'Local SEO',
    talkingPoint: 'Your homepage doesn’t say where you’re based or which areas you serve, which makes it harder to show up in local searches.',
  }),
  'seo-schema': () => ({
    impact: 6,
    title: 'Help Google and AI search understand your business',
    whyItMatters:
      'Structured data describes your business type, location and contact details in a format search engines and AI assistants can read.',
    howShopaHelps: 'Add business structured data (schema) and helpful FAQ content.',
    service: 'SEO & AI SEO',
    talkingPoint:
      'Your site isn’t giving Google and AI search tools structured details about your business. Adding them helps those tools understand and surface you.',
  }),
  'seo-alt': (a) => ({
    impact: 5,
    title: 'Describe your images for accessibility and search',
    whyItMatters: 'Image descriptions (alt text) help people using screen readers and give Google more context, including in image search.',
    howShopaHelps: 'Add descriptive alt text to images across the site.',
    service: 'SEO',
    talkingPoint: `${plural(a.page.images.missingAlt, 'image')} on your homepage ${a.page.images.missingAlt === 1 ? 'has' : 'have'} no description — an accessibility gap and a missed search opportunity.`,
  }),
  'web-content': () => ({
    impact: 4,
    title: 'Tell your story with more helpful content',
    whyItMatters: 'Thin pages give customers and search engines little to go on. Clear service information builds trust and supports rankings.',
    howShopaHelps: 'Write clear, search-friendly content for your key services.',
    service: 'SEO & content',
    talkingPoint: 'The homepage has fairly little text. Clear information about your services helps customers and Google understand what you offer.',
  }),
  'local-schema': () => ({
    impact: 4,
    title: 'Strengthen your local search signals',
    whyItMatters: 'Local business markup confirms your address, hours and contact details to search engines.',
    howShopaHelps: 'Add LocalBusiness structured data that matches your Google Business Profile.',
    service: 'Local SEO',
    talkingPoint: 'Your site isn’t telling Google your business details in a structured way, which supports local “near me” results.',
  }),
  'seo-og': () => ({
    impact: 3,
    title: 'Make your links look great when shared',
    whyItMatters: 'When your site is shared on Facebook, LinkedIn or WhatsApp, these settings control the preview image and text.',
    howShopaHelps: 'Create share images and descriptions for your key pages.',
    service: 'Creative & SEO',
    talkingPoint: 'When your website is shared on social or messaging apps, the preview is incomplete. A proper share image makes every share work harder.',
  }),
  'seo-canonical': () => ({
    impact: 3,
    title: 'Tidy up duplicate page signals',
    whyItMatters: 'Telling Google which version of a page is the main one stops search signals being split across duplicates.',
    howShopaHelps: 'Add canonical tags as part of a technical SEO tidy-up.',
    service: 'SEO',
    talkingPoint: 'There are a few technical SEO basics missing, like canonical tags, which help Google rank the right version of each page.',
  }),
  'seo-internal': () => ({
    impact: 3,
    title: 'Guide visitors deeper into your site',
    whyItMatters: 'Links between your pages help visitors find services and help Google understand your site.',
    howShopaHelps: 'Improve navigation and internal linking to key service pages.',
    service: 'SEO & website',
    talkingPoint: 'The homepage links to very few of your other pages, so visitors and Google may miss what else you offer.',
  }),
  'social-visibility': (a) => {
    const found = a.business.socialPlatforms.map((p) => SOCIAL_LABELS[p])
    return {
      impact: found.length ? 4 : 5,
      title: 'Connect your website to your social channels',
      whyItMatters: 'Links to active social profiles build trust and keep people engaged with your brand after they leave the site.',
      howShopaHelps: 'Review your social presence, then link and grow the channels that suit your customers.',
      service: 'Social media',
      talkingPoint: found.length
        ? `We could only see ${listJoin(found)} linked from your homepage. If you're active elsewhere, linking those channels builds trust.`
        : 'We couldn’t see any social media links on your homepage. If you have active accounts, linking them builds trust.',
    }
  },
  'ads-potential': () => ({
    impact: 5,
    title: 'Reach customers who are searching right now',
    whyItMatters: 'Google Ads can put you in front of people actively searching for your services and send them straight to your enquiry options.',
    howShopaHelps: 'Plan a targeted Google Ads campaign with proper conversion tracking.',
    service: 'Google Ads',
    talkingPoint:
      'You already have ways for people to get in touch — Google Ads could send more ready-to-buy searchers to them. We couldn’t see any ad tracking set up yet.',
  }),
}

/** Client-friendly "What we found" lines; falls back to the raw page evidence. */
const FOUND: Record<string, (a: MarketingAnalysis) => string> = {
  'web-design': (a) =>
    `Design freshness ${a.website.design.score}/100 — ${a.website.design.datedSignals.slice(0, 3).join('; ').toLowerCase() || 'several dated indicators'}.`,
  'web-speed': (a) => `${a.website.speed.label} on our test (Google’s target: main content within 2.5s).`,
  'web-responsive': (a) => `${a.website.responsive.label}: ${a.website.responsive.reasons.join('; ').toLowerCase() || 'layout issues on small screens'}.`,
  'web-tech': (a) => `Running ${listJoin(a.website.outdatedTech)}, which ${a.website.outdatedTech.length === 1 ? 'is' : 'are'} out of date.`,
  'web-updated': (a) => `The newest date on the site is ${a.website.lastUpdated.year} (${a.website.lastUpdated.basis}).`,
  'conv-cta': () => 'There’s no clear booking, enquiry or purchase button on your homepage.',
  'web-https': () => 'Your website isn’t served over a secure (HTTPS) connection.',
  'web-viewport': () => 'Your homepage isn’t configured to adapt to mobile screens.',
  'conv-fold': (a) =>
    firstPrimaryCta(a)
      ? `Your “${firstPrimaryCta(a)}” button only appears after scrolling.`
      : 'Your main call-to-action only appears after scrolling.',
  'seo-meta': (a) =>
    a.page.metaDescription
      ? 'Your homepage’s search description is outside the ideal length.'
      : 'Your homepage has no search description (meta description).',
  'conv-form': () => 'We couldn’t find an enquiry form on your homepage.',
  'conv-phone': () => 'We couldn’t find a phone number on your homepage.',
  'seo-title': (a) =>
    a.page.title ? `Your page title is ${a.page.title.length} characters — outside the ideal 15–65.` : 'Your homepage has no page title.',
  'seo-h1': (a) =>
    a.page.headings.h1.length ? `Your homepage has ${a.page.headings.h1.length} main headings (H1s) instead of one.` : 'Your homepage has no main heading (H1).',
  'local-location': () => 'We couldn’t find your location or service area on your homepage.',
  'seo-schema': () => 'No structured business data (schema) was found on your homepage.',
  'seo-alt': (a) => `${a.page.images.missingAlt} of ${a.page.images.total} images have no description (alt text).`,
  'web-content': (a) => `Your homepage has around ${a.page.wordCount.toLocaleString('en-AU')} words of text.`,
  'local-schema': () => 'No local business details (LocalBusiness schema) were found for search engines.',
  'seo-og': () => 'Your social share preview settings (Open Graph) are missing or incomplete.',
  'seo-canonical': () => 'No canonical tag was found on your homepage.',
  'seo-internal': (a) => `Your homepage links to ${plural(a.page.links.internal, 'other page')} on your site.`,
  'social-visibility': (a) => {
    const found = a.business.socialPlatforms.map((p) => SOCIAL_LABELS[p])
    return found.length ? `Only ${listJoin(found)} ${found.length === 1 ? 'is' : 'are'} linked from your homepage.` : 'No social media links were found on your homepage.'
  },
  'ads-potential': () => 'We couldn’t see any advertising tracking on your homepage.',
}

/** Plain-language strengths, in preferred order. */
const STRENGTHS: [string, (a: MarketingAnalysis) => string][] = [
  ['conv-fold', (a) => `A clear call-to-action (“${firstPrimaryCta(a) ?? 'contact'}”) is visible straight away`],
  ['web-viewport', () => 'The site is set up for mobile screens'],
  ['conv-phone', (a) => `Your phone number, ${a.page.phones[0]}, is easy to find`],
  ['seo-meta', () => 'A search description is in place for Google'],
  ['seo-schema', () => 'Structured business data is in place for search engines'],
  ['local-location', (a) => `Your location (${a.business.location?.label}) is clearly stated`],
  ['conv-form', () => 'Visitors can enquire through a form'],
  ['web-https', () => 'The site is secure (HTTPS)'],
]

const GLANCE: { area: string; category: CategoryId }[] = [
  { area: 'Website', category: 'website' },
  { area: 'Google search', category: 'seo' },
  { area: 'Getting enquiries', category: 'conversion' },
  { area: 'Social media', category: 'social' },
  { area: 'Local visibility', category: 'local' },
]

const GLANCE_STATUS: Record<CategoryStatus, [GlanceStatus, string]> = {
  good: ['strong', 'Strong'],
  attention: ['improve', 'Room to improve'],
  detected: ['strong', 'Linked from site'],
  limited: ['missing', 'Not found on homepage'],
  research: ['unknown', 'Needs a conversation'],
}

function allChecks(a: MarketingAnalysis): Check[] {
  return Object.values(a.categories).flatMap((c) => c.checks)
}

/** One talking-point sentence per failed AI-friendly check, using this page's details. */
const AI_GAP_SENTENCES: Record<AiGap, (a: MarketingAnalysis) => string> = {
  'ai-blocked': (a) => {
    const tools = [...new Set((a.page.aiSignals?.robots.blockedCrawlers ?? []).map((c) => AI_CRAWLERS[c] ?? c))]
    return `Your website tells AI tools (${listJoin(tools)}) not to read it, so they can’t use your site when recommending businesses.`
  },
  'js-only': () =>
    'Most of your homepage text only appears after JavaScript runs. Many AI tools don’t run JavaScript, so they may see an almost empty page.',
  'customer-info': (a) =>
    `AI tools can’t find your ${listJoin(missingCustomerDetails(a.page), 'or')} on your homepage — details customers often check before choosing a business.`,
  schema: () => 'Your site has no structured data — the behind-the-scenes code AI tools read to understand what a business is and does.',
  'business-schema': (a) =>
    `Your ${a.page.schema.name ? 'phone number and address aren’t' : 'business name and contact details aren’t'} in a format AI tools can read, so they can’t easily confirm who you are or where to find you.`,
  faq: () => 'There’s no FAQ section, so AI tools have no ready answers to the questions your customers are asking.',
  text: (a) =>
    `Your homepage has only around ${a.page.wordCount.toLocaleString('en-AU')} words of text, which gives AI tools little to go on when describing your services.`,
  'title-description': (a) =>
    a.page.metaDescription
      ? 'Your page title is too short to tell AI tools what you do or where.'
      : 'Your homepage has no search description — the short summary AI tools and Google use to describe your business.',
  h1: (a) =>
    a.page.headings.h1.length
      ? `Your homepage has ${a.page.headings.h1.length} main headings instead of one, which blurs what your business is about.`
      : 'Your homepage has no main heading, so AI tools have to guess what your business is about.',
  sections: () => 'Your homepage isn’t broken into clear sections, which makes it harder for AI tools to pick out your services.',
}

/** Improvement for a homepage that AI answer engines would struggle to understand. */
function aiImprovement(a: MarketingAnalysis): (ClientImprovement & { impact: number }) | null {
  const ai = a.website.aiFriendly
  if (!ai || ai.rating === 'good' || ai.rating === 'unknown') return null
  const gaps = ai.missing.slice(0, 3).map((g) => g.charAt(0).toLowerCase() + g.slice(1))
  return {
    id: 'ai-friendly',
    kind: 'found',
    impact: 7,
    title: 'Make your website easier for AI search to understand',
    found: `${ai.label}: ${gaps.join('; ')}.`,
    whyItMatters:
      'AI tools such as ChatGPT and Google’s AI Overviews now answer many searches directly. They rely on websites that clearly describe the business and answer common questions.',
    howShopaHelps: 'Add business structured data, clear headings and helpful FAQ content so AI tools can understand and recommend you.',
    service: 'SEO & AI SEO',
    talkingPoint: [
      ai.rating === 'poor'
        ? 'Your homepage isn’t set up for AI search tools like ChatGPT and Google’s AI Overviews.'
        : 'Your homepage is only partly ready for AI search tools like ChatGPT.',
      // The two most important gaps, one sentence each. Analyses saved before gap ids existed list the gaps instead.
      ...(ai.gaps ? ai.gaps.slice(0, 2).map((gap) => AI_GAP_SENTENCES[gap](a)) : [`Gaps: ${gaps.slice(0, 2).join('; ')}.`]),
    ].join(' '),
  }
}

function buildImprovements(a: MarketingAnalysis): ClientImprovement[] {
  const checks = allChecks(a)
  const ai = aiImprovement(a)
  const found = a.opportunities
    .filter((o) => o.certainty !== 'research')
    .map((o) => {
      const key = o.id.replace(/^opp-/, '')
      const factory = IMPROVEMENTS[key]
      if (!factory) return null
      const copy = factory(a, findCheck(checks, key))
      const kind: ClientImprovement['kind'] = key === 'ads-potential' ? 'growth' : 'found'
      return { ...copy, id: key, found: FOUND[key]?.(a) ?? o.evidence, kind }
    })
    .filter((i): i is ClientImprovement & { impact: number } => i !== null)
    // The AI point already covers structured data, so it replaces the schema point.
    .filter((i) => !(ai && i.id === 'seo-schema'))
    .concat(ai ? [ai] : [])
    // Evidenced findings first, then growth ideas; highest sales value first within each.
    .sort((x, y) => (x.kind === y.kind ? y.impact - x.impact : x.kind === 'found' ? -1 : 1))
    .slice(0, 5)

  // Strong sites may have fewer than three evidenced gaps: add honest growth ideas.
  const growth: ClientImprovement[] = []
  if (a.page.tracking.googleAds || a.page.tracking.metaPixel) {
    growth.push({
      id: 'ads-review',
      kind: 'growth',
      title: 'Get more from your existing advertising',
      found: 'Advertising tracking is installed on the site.',
      whyItMatters: 'If ads are running, regular optimisation of targeting, ads and landing pages often improves results.',
      howShopaHelps: 'A no-obligation review of your current ad accounts.',
      service: 'Google Ads & paid social',
      talkingPoint: 'We can see ad tracking on your site. If you’re running ads, we’d be happy to review how they’re performing.',
    })
  }
  if (FEATURES.ooh && a.business.location && hasPhysicalFootprint(a.business)) {
    growth.push({
      id: 'ooh',
      kind: 'growth',
      title: 'Build local awareness with outdoor advertising',
      found: `Your business is based in ${a.business.location.label}.`,
      whyItMatters: 'Billboards, transit and shopping-centre screens near your location can keep you top of mind with local customers.',
      howShopaHelps: 'Scope an out-of-home plan around your location, audience and budget.',
      service: 'OOH advertising',
      talkingPoint: 'Have you considered outdoor advertising near your location? We can scope options around your goals and budget.',
    })
  }
  growth.push({
    id: 'audit',
    kind: 'growth',
    title: 'See the full picture with a complete audit',
    found: 'This snapshot covers your homepage only.',
    whyItMatters: 'A full audit reviews every page, your Google Business Profile, reviews and competitors.',
    howShopaHelps: 'A full website, search and local marketing audit with clear priorities.',
    service: 'SEO & strategy',
    talkingPoint: 'This is just a homepage snapshot — a full audit would show you the complete picture, including how you compare with competitors.',
  })

  const list: ClientImprovement[] = found.map(({ impact: _impact, ...rest }) => rest)
  for (const idea of growth) {
    if (list.length >= 3) break
    list.push(idea)
  }
  return list
}

/** What a better website would win for this business, from its main CTA. */
function conversionGoal(a: MarketingAnalysis): string {
  const intents = a.page.ctas.map((c) => c.intent)
  if (intents.includes('shop')) return 'online sales'
  if (intents.includes('book')) return 'bookings'
  if (intents.includes('start') || intents.includes('apply')) return 'sign-ups'
  return 'enquiries'
}

function onlineSinceYear(intel: WebsiteIntel | null): number | null {
  const iso = intel?.domainInfo.registeredOn ?? intel?.archive.firstSeen
  return iso ? new Date(iso).getFullYear() : null
}

/**
 * Two-line pitch: line 1 diagnoses the site from evidence, line 2 frames the
 * offer. Website projects lead when the evidence supports them; otherwise the
 * pitch moves to growth services. Wording describes intent, never guarantees.
 */
export function buildPitch(a: MarketingAnalysis, intel: WebsiteIntel | null): [string, string] {
  const w = a.website
  const name = a.business.name
  const goal = conversionGoal(a)
  const since = onlineSinceYear(intel)
  const platform = w.platform && !w.outdatedTech.length ? ` (built on ${w.platform})` : ''

  if (w.rebuildFit !== 'low') {
    const line1 = `${name}’s website${platform}${since ? ` has been online since ${since} and` : ''} ${listJoin(w.rebuildReasons.slice(0, 3))}.`
    const line2 =
      w.rebuildFit === 'strong'
        ? `A modern, mobile-first website from Shopa — faster, easier to use and built to convert — is designed to turn more of those visitors into ${goal}.`
        : `A targeted refresh from Shopa — modernising the design, speeding up the pages and sharpening the calls-to-action — is designed to win more ${goal} from the traffic the site already gets.`
    return [line1, line2]
  }

  const growth = a.services.filter((s) => s.service !== 'website').map((s) => s.label)
  const gaps = a.opportunities.filter((o) => o.certainty !== 'research').length
  return [
    `${name}’s website${platform} is in good technical shape${gaps ? ', with a few smaller improvements to tidy up' : ''} — so the biggest opportunity is getting more of the right people to it.`,
    `Shopa can grow ${goal} through ${growth.length ? listJoin(growth.slice(0, 3)) : 'SEO and Google Ads'}, building on the website ${name} already has.`,
  ]
}

function comparisonRow(a: MarketingAnalysis, isSubject: boolean): ComparisonRow {
  const w = a.website
  return {
    name: a.business.name,
    domain: a.business.domain,
    isSubject,
    platform: w.platform ?? 'Custom-coded',
    speed: w.speed.lcpMs !== null ? `${(w.speed.lcpMs / 1000).toFixed(1)}s (${w.speed.label.split(' — ')[0].toLowerCase()})` : w.speed.label.split(' — ')[0],
    mobile: w.responsive.label,
    design: `${{ modern: 'Modern', dated: 'Dated', outdated: 'Outdated' }[w.design.rating]} (${w.design.score})`,
  }
}

export interface ClientReportExtras {
  intel?: WebsiteIntel | null
  intelLoading?: boolean
  competitors?: MarketingAnalysis[]
}

export function buildClientReport(
  a: MarketingAnalysis,
  settings: { contactLine: string },
  extras: ClientReportExtras = {},
): ClientReport {
  const intel = extras.intel ?? null
  const checks = allChecks(a)
  const improvements = buildImprovements(a)
  const evidenced = improvements.filter((i) => i.kind === 'found').length

  const glance: GlanceItem[] = GLANCE.map(({ area, category }) => {
    const [status, label] = GLANCE_STATUS[a.categories[category].status]
    return { area, status, label }
  })

  const strengths = STRENGTHS.filter(([id]) => findCheck(checks, id)?.status === 'good')
    .slice(0, 3)
    .map(([, text]) => text(a))
  const social = a.business.socialPlatforms.map((p) => SOCIAL_LABELS[p])
  if (strengths.length < 3 && social.length) strengths.push(`Social profiles linked: ${listJoin(social)}`)

  return {
    business: a.business.name,
    website: a.business.domain,
    date: formatDate(a.analysedAt),
    contactLine: settings.contactLine.trim() || null,
    intro: evidenced
      ? `We reviewed the homepage of ${a.business.domain} and found ${plural(evidenced, 'practical improvement')} that could help it attract and convert more customers.`
      : `We reviewed the homepage of ${a.business.domain}. The basics are in good shape, so we’ve focused on growth ideas worth discussing.`,
    pitch: buildPitch(a, intel),
    websiteFacts: buildWebsiteFacts(a, intel, extras.intelLoading ?? false),
    comparison: FEATURES.competitors && extras.competitors?.length
      ? [comparisonRow(a, true), ...extras.competitors.map((c) => comparisonRow(c, false))]
      : [],
    glance,
    strengths,
    improvements,
    disclaimer: `This snapshot is based on an automated review of publicly visible information on your homepage on ${formatDate(a.analysedAt)}. Some items may exist elsewhere on your website or online. It is a starting point for discussion, not a full audit, and no results are guaranteed.`,
  }
}

export function clientReportToText(r: ClientReport): string {
  return [
    'SHOPA MARKETING — WEBSITE OPPORTUNITY SNAPSHOT',
    `Prepared for: ${r.business} (${r.website})`,
    `Date: ${r.date}`,
    '',
    r.intro,
    '',
    'OUR RECOMMENDATION',
    ...r.pitch,
    '',
    'YOUR WEBSITE AT A GLANCE',
    ...r.websiteFacts.map((f) => `- ${f.label}: ${f.value}${f.detail ? ` (${f.detail})` : ''}`),
    ...(r.comparison.length
      ? ['', 'HOW YOU COMPARE', ...r.comparison.map((c) => `- ${c.name}: ${c.platform} · speed ${c.speed} · ${c.mobile} · design ${c.design}`)]
      : []),
    '',
    'MARKETING AT A GLANCE',
    ...r.glance.map((g) => `- ${g.area}: ${g.label}`),
    '',
    ...(r.strengths.length ? ['WHAT’S WORKING WELL', ...r.strengths.map((s) => `- ${s}`), ''] : []),
    'TOP IMPROVEMENTS',
    ...r.improvements.flatMap((i, n) => [
      `${n + 1}. ${i.title}${i.kind === 'growth' ? ' (growth idea)' : ''}`,
      `   What we found: ${i.found}`,
      `   Why it matters: ${i.whyItMatters}`,
      `   How Shopa can help: ${i.howShopaHelps}`,
    ]),
    '',
    ...(r.contactLine ? [r.contactLine, ''] : []),
    '',
    r.disclaimer,
  ].join('\n')
}

/** `seoPoint` (from the last SEO ranking check) comes last, after the improvements. */
export function talkingPointsToText(r: ClientReport, seoPoint: string | null = null): string {
  const points = [...r.improvements.map((i) => i.talkingPoint), ...(seoPoint ? [seoPoint] : [])]
  return [
    `Talking points — ${r.business}`,
    '',
    'Opening pitch:',
    ...r.pitch,
    '',
    ...points.map((p, n) => `${n + 1}. ${p}`),
  ].join('\n')
}

/**
 * A talking point from the last SEO ranking check, only when the business is on
 * page 1 for none of the searches checked. Null when no check has been run or it
 * is on page 1 for any search.
 */
export function seoTalkingPoint(a: MarketingAnalysis, report: KeywordReport | null): string | null {
  const rankings = report?.keywords.filter((k) => !k.error) ?? []
  if (rankings.length === 0) return null
  if (rankings.some((k) => k.position !== null && pageOf(k, k.position) === 1)) return null
  const searches = plural(rankings.length, 'Google search', 'Google searches')
  const keywords = listJoin([...new Set(rankings.map((k) => `“${k.keyword}”`))])
  return `We checked ${searches} your customers make (${keywords}), and ${a.business.name} isn’t on page 1 for ${rankings.length === 1 ? 'it' : 'any of them'}. Those customers are going to competitors, and better SEO can win them back.`
}
