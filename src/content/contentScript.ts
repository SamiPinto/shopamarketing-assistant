/**
 * Content script — injected on demand (never on every page) when a user clicks
 * "Analyse Website". It reads publicly rendered DOM content of the current
 * page. Its only network requests are two same-origin reads for the AI-friendly
 * check (robots.txt and a plain copy of this page); no form interaction, no
 * storage access, and nothing behind logins is fetched.
 */
import {
  AU_ADDRESS_PATTERN,
  AU_PHONE_PATTERN,
  EMAIL_PATTERN,
  classifyCta,
  classifySocialUrl,
  blockedAiCrawlers,
  normaliseWhitespace,
} from '../utils/signals'
import { EXTRACT_MESSAGE } from '../types/misc'
import { designSignals, detectTech, freshnessSignals, measurePerformance } from './detectors'
import type { ContentRequest, ContentResponse } from '../types/misc'
import type {
  AiSignals,
  CtaSignal,
  FormSummary,
  PageExtraction,
  SchemaSummary,
  SocialLink,
  TrackingSignals,
} from '../types/page'

// Hard limits keep extraction fast on very large pages.
const LIMITS = {
  headings: 25,
  links: 2500,
  ctaCandidates: 400,
  ctas: 20,
  contacts: 5,
  addresses: 3,
  textChars: 150_000,
  inlineScripts: 60,
  inlineScriptChars: 20_000,
  questionCandidates: 400,
  fetchMs: 3000,
}

let truncated = false

function textOf(el: Element): string {
  return normaliseWhitespace(el.textContent ?? '').slice(0, 160)
}

function meta(selector: string): string | null {
  const value = document.querySelector<HTMLMetaElement>(selector)?.content?.trim()
  return value ? value : null
}

function isVisible(el: Element): boolean {
  if ('checkVisibility' in el) return el.checkVisibility()
  return (el as HTMLElement).offsetParent !== null
}

function headings(tag: 'h1' | 'h2' | 'h3'): string[] {
  const nodes = Array.from(document.querySelectorAll(tag))
  if (nodes.length > LIMITS.headings) truncated = true
  return nodes
    .slice(0, LIMITS.headings)
    .map(textOf)
    .filter(Boolean)
}

function linkSummary(): { total: number; internal: number; external: number; anchors: HTMLAnchorElement[] } {
  const anchors = Array.from(document.querySelectorAll<HTMLAnchorElement>('a[href]'))
  if (anchors.length > LIMITS.links) truncated = true
  const scanned = anchors.slice(0, LIMITS.links)
  const host = location.hostname.replace(/^www\./, '')
  let internal = 0
  let external = 0
  for (const a of scanned) {
    if (!/^https?:/.test(a.protocol)) continue
    const linkHost = a.hostname.replace(/^www\./, '')
    if (linkHost === host) internal++
    else external++
  }
  return { total: anchors.length, internal, external, anchors: scanned }
}

function socialLinks(anchors: HTMLAnchorElement[]): SocialLink[] {
  const found = new Map<SocialLink['platform'], string>()
  for (const a of anchors) {
    const platform = classifySocialUrl(a.href)
    if (platform && !found.has(platform)) found.set(platform, a.href)
  }
  return Array.from(found, ([platform, url]) => ({ platform, url }))
}

function ctas(): { ctas: CtaSignal[]; buttonCount: number } {
  const buttons = document.querySelectorAll('button, [role="button"], input[type="submit"], input[type="button"]')
  const candidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      'button, [role="button"], input[type="submit"], input[type="button"], a[href]',
    ),
  ).slice(0, LIMITS.ctaCandidates)

  const seen = new Set<string>()
  const result: CtaSignal[] = []
  const fold = window.innerHeight

  for (const el of candidates) {
    if (result.length >= LIMITS.ctas) break
    const raw = el instanceof HTMLInputElement ? el.value : (el.textContent ?? el.getAttribute('aria-label') ?? '')
    const text = normaliseWhitespace(raw)
    const intent = classifyCta(text)
    if (!intent || seen.has(text.toLowerCase()) || !isVisible(el)) continue
    seen.add(text.toLowerCase())
    const rect = el.getBoundingClientRect()
    result.push({
      text,
      intent,
      element: el instanceof HTMLAnchorElement ? 'link' : el instanceof HTMLInputElement ? 'input' : 'button',
      aboveFold: rect.top + window.scrollY < fold && rect.height > 0,
    })
  }
  return { ctas: result, buttonCount: buttons.length }
}

function forms(): FormSummary {
  const formEls = Array.from(document.querySelectorAll('form'))
  let fieldCount = 0
  let hasEmailField = false
  let hasPhoneField = false
  let searchForms = 0
  for (const form of formEls) {
    const fields = Array.from(
      form.querySelectorAll<HTMLInputElement>('input:not([type="hidden"]):not([type="submit"]), select, textarea'),
    )
    fieldCount += fields.length
    if (fields.some((f) => f.type === 'email' || /email/i.test(f.name))) hasEmailField = true
    if (fields.some((f) => f.type === 'tel' || /phone|mobile/i.test(f.name))) hasPhoneField = true
    const isSearch =
      form.getAttribute('role') === 'search' ||
      (fields.length <= 2 && fields.some((f) => f.type === 'search' || /^(s|q|search)$/i.test(f.name)))
    if (isSearch) searchForms++
  }
  return {
    count: formEls.length,
    fieldCount,
    hasEmailField,
    hasPhoneField,
    searchOnly: formEls.length > 0 && searchForms === formEls.length,
  }
}

function unique(values: string[], limit: number): string[] {
  return Array.from(new Set(values.map((v) => v.trim()).filter(Boolean))).slice(0, limit)
}

function contacts(anchors: HTMLAnchorElement[], bodyText: string): { phones: string[]; emails: string[] } {
  const telLinks = anchors
    .filter((a) => a.protocol === 'tel:')
    .map((a) => decodeURIComponent(a.href.replace(/^tel:/, '')))
  const mailLinks = anchors
    .filter((a) => a.protocol === 'mailto:')
    .map((a) => decodeURIComponent(a.href.replace(/^mailto:/, '').split('?')[0]))
  const textPhones = bodyText.match(AU_PHONE_PATTERN) ?? []
  const textEmails = (bodyText.match(EMAIL_PATTERN) ?? []).filter(
    (e) => !/\.(png|jpe?g|gif|webp|svg)$/i.test(e),
  )
  // Text matches first: they keep the business's own formatting ("1800 247 034").
  // Dedupe on digits with the +61 / 0 prefix removed so tel: links don't duplicate them.
  const seenPhones = new Set<string>()
  const phones = [...textPhones, ...telLinks].map(normaliseWhitespace).filter((phone) => {
    const key = phone.replace(/\D/g, '').replace(/^61/, '').replace(/^0/, '')
    if (key.length < 6 || seenPhones.has(key)) return false
    seenPhones.add(key)
    return true
  })
  return {
    phones: phones.slice(0, LIMITS.contacts),
    emails: unique([...mailLinks, ...textEmails].map((e) => e.toLowerCase()), LIMITS.contacts),
  }
}

type JsonObject = Record<string, unknown>

function asString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) return value.trim()
  return null
}

function collectSchemaNodes(value: unknown, out: JsonObject[], depth = 0): void {
  if (depth > 6 || !value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    value.forEach((v) => collectSchemaNodes(v, out, depth + 1))
    return
  }
  const node = value as JsonObject
  out.push(node)
  if (node['@graph']) collectSchemaNodes(node['@graph'], out, depth + 1)
}

const BUSINESS_TYPES = /(Organization|LocalBusiness|Store|Dentist|Restaurant|Physician|Clinic|Gym|Club|Service|Agent|Attorney|Shop|Corporation|Business)/i

function schema(): { summary: SchemaSummary; dateModified: string | null } {
  const blocks = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
  const nodes: JsonObject[] = []
  for (const block of blocks) {
    try {
      collectSchemaNodes(JSON.parse(block.textContent ?? ''), nodes)
    } catch {
      // Malformed JSON-LD is common; skip the block rather than fail the scan.
    }
  }
  const types = new Set<string>()
  for (const node of nodes) {
    const t = node['@type']
    for (const value of Array.isArray(t) ? t : [t]) {
      const type = asString(value)
      if (type) types.add(type)
    }
  }
  const business = nodes.find((n) => {
    const t = n['@type']
    return (Array.isArray(t) ? t : [t]).some((v) => typeof v === 'string' && BUSINESS_TYPES.test(v))
  })
  const address = (business?.address ?? null) as JsonObject | null
  const addr = address && typeof address === 'object' && !Array.isArray(address) ? address : null

  const dateModified = nodes.map((n) => asString(n.dateModified)).find(Boolean) ?? null

  return {
    dateModified,
    summary: {
    types: Array.from(types).slice(0, 20),
    blockCount: blocks.length,
    name: asString(business?.name),
    telephone: asString(business?.telephone),
    locality: asString(addr?.addressLocality),
    region: asString(addr?.addressRegion),
    postcode: asString(addr?.postalCode),
    streetAddress: asString(addr?.streetAddress),
    },
  }
}

function addressCandidates(bodyText: string): string[] {
  const fromElements = Array.from(
    document.querySelectorAll('address, [itemprop="address"], [class*="address" i]'),
  )
    .slice(0, 10)
    .map(textOf)
    .filter((t) => t.length > 8 && t.length < 160)
  const fromText = (bodyText.match(AU_ADDRESS_PATTERN) ?? []).map((t) => normaliseWhitespace(t))
  return unique([...fromElements, ...fromText], LIMITS.addresses)
}

function tracking(): TrackingSignals {
  const srcs = Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]')).map((s) => s.src)
  const inline = Array.from(document.querySelectorAll<HTMLScriptElement>('script:not([src])'))
    .slice(0, LIMITS.inlineScripts)
    .map((s) => (s.textContent ?? '').slice(0, LIMITS.inlineScriptChars))
    .join('\n')
  const has = (pattern: RegExp) => srcs.some((s) => pattern.test(s)) || pattern.test(inline)

  return {
    googleTagManager: has(/googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]{4,}/),
    googleAnalytics: has(/google-analytics\.com|gtag\/js\?id=G-|['"]G-[A-Z0-9]{6,}['"]/),
    googleAds: has(/googleadservices\.com|googleads\.g\.doubleclick\.net|gtag\/js\?id=AW-|['"]AW-\d{6,}/),
    metaPixel: has(/connect\.facebook\.net\/[^"']*fbevents|fbq\(\s*['"]init/),
    linkedInInsight: has(/snap\.licdn\.com|_linkedin_partner_id/),
    tiktokPixel: has(/analytics\.tiktok\.com|ttq\.load/),
  }
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), LIMITS.fetchMs)
  try {
    return await fetch(url, { ...init, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

/** Which AI crawlers the site's robots.txt blocks. */
async function robotsSignal(): Promise<AiSignals['robots']> {
  try {
    const res = await fetchWithTimeout(new URL('/robots.txt', location.origin).href, { credentials: 'omit' })
    if (res.status === 404 || res.status === 410) return { status: 'none', blockedCrawlers: [] }
    if (!res.ok) return { status: 'unavailable', blockedCrawlers: [] }
    const text = await res.text()
    // Some sites answer with an HTML "not found" page instead of a 404.
    if (/^\s*</.test(text)) return { status: 'none', blockedCrawlers: [] }
    return { status: 'found', blockedCrawlers: blockedAiCrawlers(text) }
  } catch {
    return { status: 'unavailable', blockedCrawlers: [] }
  }
}

/** Words in this page's HTML as served, before any JavaScript runs. */
async function rawWordCount(): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(location.href, { credentials: 'same-origin' })
    if (!res.ok || !/html/i.test(res.headers.get('content-type') ?? '')) return null
    // DOMParser never runs the page's scripts.
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html')
    doc.querySelectorAll('script, style, noscript, template').forEach((el) => el.remove())
    return (doc.body?.textContent ?? '').split(/\s+/).filter(Boolean).length
  } catch {
    return null
  }
}

const HOURS_PATTERN =
  /\b(opening hours|business hours|trading hours|office hours|hours of operation|open 7 days|24\/7)\b|\b(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b[^\n]{0,40}?\b\d{1,2}(:\d{2})?\s?(am|pm)\b/i
const SERVICE_AREA_PATTERN = /\b(serving|we serve|service areas?|areas we (serve|cover)|servicing|located in|based in)\b/i
const REVIEWS_PATTERN = /\b(testimonials?|reviews?|what our (clients|customers|patients) say)\b|★/i
const REVIEW_WIDGET_PATTERN = /trustindex|elfsight|trustpilot|reviews\.io|birdeye|judge\.me|yotpo|okendo|stamped\.io/i

/** Details customers often ask AI tools about: opening hours, service area and reviews. */
function customerDetails(bodyText: string, addresses: string[]): Pick<AiSignals, 'openingHours' | 'serviceArea' | 'reviews'> {
  const ld = Array.from(document.querySelectorAll('script[type="application/ld+json"]'))
    .map((s) => s.textContent ?? '')
    .join(' ')
  const embeds = Array.from(document.querySelectorAll<HTMLScriptElement | HTMLIFrameElement>('script[src], iframe[src]'))
    .map((el) => el.src)
    .join(' ')
  return {
    openingHours: /"openingHours/i.test(ld) || HOURS_PATTERN.test(bodyText),
    serviceArea: /"(areaServed|address)"/i.test(ld) || addresses.length > 0 || SERVICE_AREA_PATTERN.test(bodyText),
    reviews: /"(aggregateRating|review)"/i.test(ld) || REVIEW_WIDGET_PATTERN.test(embeds) || REVIEWS_PATTERN.test(bodyText),
  }
}

/**
 * Counts distinct questions shown as FAQ items: headings, accordion toggles
 * (<summary>, buttons, aria-expanded) and text inside FAQ/accordion blocks.
 */
function questionCount(): number {
  const nodes = Array.from(
    document.querySelectorAll(
      'h2, h3, h4, h5, h6, summary, dt, button, [aria-expanded], [class*="faq" i] *, [id*="faq" i] *, [class*="accordion" i] *',
    ),
  )
  if (nodes.length > LIMITS.questionCandidates) truncated = true
  const questions = new Set<string>()
  for (const node of nodes.slice(0, LIMITS.questionCandidates)) {
    const text = normaliseWhitespace(node.textContent ?? '')
    // A real question: ends in "?", at least four words, not a whole FAQ block.
    if (text.endsWith('?') && text.length <= 200 && text.split(' ').length >= 4) questions.add(text.toLowerCase())
  }
  return questions.size
}

/** Exported for testing; the IIFE exposes it as ShopaContentScript.extract. */
export async function extract(): Promise<PageExtraction> {
  truncated = false
  // innerText forces layout, so read it exactly once.
  const fullText = document.body?.innerText ?? ''
  const bodyText = fullText.slice(0, LIMITS.textChars)
  if (fullText.length > LIMITS.textChars) truncated = true

  const links = linkSummary()
  const images = Array.from(document.images)
  const { ctas: ctaSignals, buttonCount } = ctas()
  const contact = contacts(links.anchors, bodyText)
  const schemaResult = schema()
  const addresses = addressCandidates(bodyText)
  const [performanceSignals, robots, rawWords] = await Promise.all([measurePerformance(), robotsSignal(), rawWordCount()])

  return {
    url: location.href,
    domain: location.hostname.replace(/^www\./, ''),
    protocol: location.protocol.replace(':', ''),
    title: normaliseWhitespace(document.title),
    lang: document.documentElement.lang || null,
    metaDescription: meta('meta[name="description" i]'),
    canonical: document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href ?? null,
    viewport: meta('meta[name="viewport" i]'),
    headings: { h1: headings('h1'), h2: headings('h2'), h3: headings('h3') },
    images: {
      total: images.length,
      missingAlt: images.filter((img) => !img.hasAttribute('alt')).length,
    },
    links: { total: links.total, internal: links.internal, external: links.external },
    forms: forms(),
    buttonCount,
    ctas: ctaSignals,
    phones: contact.phones,
    emails: contact.emails,
    socialLinks: socialLinks(links.anchors),
    addressCandidates: addresses,
    schema: schemaResult.summary,
    openGraph: {
      title: meta('meta[property="og:title"]'),
      description: meta('meta[property="og:description"]'),
      image: meta('meta[property="og:image"]'),
      siteName: meta('meta[property="og:site_name"]'),
    },
    tracking: tracking(),
    tech: detectTech(),
    performance: performanceSignals,
    design: designSignals(),
    freshness: freshnessSignals(bodyText, schemaResult.dateModified),
    wordCount: bodyText.split(/\s+/).filter(Boolean).length,
    questionCount: questionCount(),
    aiSignals: { robots, rawWordCount: rawWords, ...customerDetails(bodyText, addresses) },
    truncated,
    extractedAt: new Date().toISOString(),
    source: 'live',
  }
}

declare global {
  interface Window {
    __shopaAssistantLoaded?: boolean
  }
}

// The script may be injected more than once into the same page; register once.
if (!window.__shopaAssistantLoaded && typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
  window.__shopaAssistantLoaded = true
  chrome.runtime.onMessage.addListener(
    (message: ContentRequest, _sender, sendResponse: (response: ContentResponse) => void) => {
      if (message?.type !== EXTRACT_MESSAGE) return false
      extract().then(
        (data) => sendResponse({ ok: true, data }),
        (error: unknown) => sendResponse({ ok: false, error: error instanceof Error ? error.message : 'Extraction failed' }),
      )
      return true // async response
    },
  )
}
