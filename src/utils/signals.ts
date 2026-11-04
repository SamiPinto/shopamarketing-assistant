import type { CtaIntent, SocialPlatform } from '../types/page'

/** Ordered: the first matching intent wins (e.g. "Book a call" → book). */
const CTA_PATTERNS: [CtaIntent, RegExp][] = [
  ['book', /\b(book|booking|appointment|reserve|schedule a)\b/i],
  ['quote', /\b(quote|estimate|pricing request)\b/i],
  ['enquire', /\b(enquir|inquir)/i],
  ['call', /\b(call now|call us|call today|phone us)\b/i],
  ['contact', /\b(contact|get in touch|talk to us|speak to)\b/i],
  ['start', /\b(get started|start now|start your|start free|sign up|join now|join today|free trial)\b/i],
  ['shop', /\b(shop now|shop the|buy now|add to cart|add to bag|order now|order online)\b/i],
  ['apply', /\bapply\b/i],
  ['subscribe', /\b(subscribe|newsletter)\b/i],
  ['learn', /\b(learn more|find out more|discover more|see how)\b/i],
]

export function classifyCta(text: string): CtaIntent | null {
  const normalised = text.replace(/\s+/g, ' ').trim()
  // Long strings are paragraphs or menus, not calls to action.
  if (normalised.length < 2 || normalised.length > 48) return null
  for (const [intent, pattern] of CTA_PATTERNS) {
    if (pattern.test(normalised)) return intent
  }
  return null
}

/** Primary intents represent a direct conversion action (vs. "learn more"). */
export const PRIMARY_CTA_INTENTS: CtaIntent[] = [
  'book',
  'quote',
  'enquire',
  'call',
  'contact',
  'start',
  'shop',
  'apply',
]

const SOCIAL_HOSTS: [SocialPlatform, RegExp][] = [
  ['instagram', /(^|\.)instagram\.com$/],
  ['facebook', /(^|\.)(facebook\.com|fb\.com|fb\.me)$/],
  ['linkedin', /(^|\.)linkedin\.com$/],
  ['tiktok', /(^|\.)tiktok\.com$/],
  ['youtube', /(^|\.)(youtube\.com|youtu\.be)$/],
  ['x', /(^|\.)(twitter\.com|x\.com)$/],
]

// Share/intent URLs point at the platform but not at the business's profile.
const SHARE_PATH = /(sharer|share\.php|\/share|intent\/|shareArticle|\/dialog\/)/i

export function classifySocialUrl(href: string): SocialPlatform | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (SHARE_PATH.test(url.pathname + url.search)) return null
  const host = url.hostname.toLowerCase()
  for (const [platform, pattern] of SOCIAL_HOSTS) {
    if (pattern.test(host)) return platform
  }
  return null
}

export const SOCIAL_LABELS: Record<SocialPlatform, string> = {
  instagram: 'Instagram',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  x: 'X',
}

export const SOCIAL_PLATFORMS: SocialPlatform[] = [
  'instagram',
  'facebook',
  'linkedin',
  'tiktok',
  'youtube',
  'x',
]

/** Australian phone formats: landline/mobile, 1300/1800 and 13 xx xx. */
export const AU_PHONE_PATTERN =
  /(?:\+61[\s-]?|\(0[2378]\)\s?|\b0)[2-478](?:[\s-]?\d){8}\b|\b1[38]00(?:[\s-]?\d){6}\b|\b13(?:[\s-]?\d){4}\b/g

export const EMAIL_PATTERN = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi

/** Street-address-like fragment ending in an Australian state and postcode. */
export const AU_ADDRESS_PATTERN =
  /[A-Za-z0-9 ,.'/-]{0,80}\b(VIC|NSW|QLD|WA|SA|TAS|ACT|NT|Victoria|New South Wales|Queensland|Tasmania|Western Australia|South Australia)\b,?\s+\d{4}\b/g

export function normaliseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim()
}
