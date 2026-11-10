import { MARKETS, type Market, type MarketCode } from '../../data/markets'
import type { BusinessProfile } from '../../types/analysis'
import type { PageExtraction } from '../../types/page'

/**
 * Works out which country a business is in from what the site shows: schema
 * address country, domain ending, international phone numbers, address and
 * postcode formats (footer and contact blocks), the page language and city
 * names. Each signal adds evidence; a country is only chosen when it clearly
 * leads, otherwise the result is null rather than a guess.
 */

const MIN_SCORE = 4

// "en-US" is the default language of many website builders, so it says little.
const WEAK_LANG = new Set<MarketCode>(['US'])

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mentionsCity(text: string, city: string): boolean {
  return new RegExp(`\\b${escapeRegExp(city)}\\b`, 'i').test(text)
}

interface Evidence {
  market: Market
  score: number
  reasons: string[]
}

export function detectCountry(page: PageExtraction): BusinessProfile['country'] {
  const addressText = [
    ...page.addressCandidates,
    page.footerText ?? '',
    [page.schema.streetAddress, page.schema.locality, page.schema.region, page.schema.postcode].filter(Boolean).join(', '),
  ].join('\n')
  const prominentText = [page.title, ...page.headings.h1].join(' ')
  const phones = [...page.phones, page.schema.telephone ?? ''].map((p) => p.replace(/[\s().-]/g, ''))
  const schemaCountry = (page.schema.country ?? '').trim().toLowerCase()
  const langRegion = (page.lang ?? '').split(/[-_]/)[1]?.toUpperCase() ?? ''
  const host = page.domain.toLowerCase()

  const evidence: Evidence[] = MARKETS.map((market) => {
    const reasons: string[] = []
    let score = 0
    const add = (points: number, reason: string) => {
      score += points
      reasons.push(reason)
    }

    if (schemaCountry && (schemaCountry === market.code.toLowerCase() || market.names.includes(schemaCountry) || (market.code === 'GB' && schemaCountry === 'uk'))) {
      add(6, 'Schema.org address country')
    }
    if (market.tlds.test(host)) add(4, `.${host.split('.').slice(1).join('.')} domain`)
    if (phones.some((p) => p.startsWith(`+${market.dialCode}`) || p.startsWith(`00${market.dialCode}`))) {
      add(4, `+${market.dialCode} phone number`)
    }
    if (market.address.test(addressText)) add(4, 'Address format on the page')
    else if (market.names.some((n) => n.length > 3 && mentionsCity(addressText, n))) add(3, 'Country named in the address')
    const city = market.cities.find((c) => mentionsCity(addressText, c))
    if (city) add(3, `${city} in the address or footer`)
    else {
      const named = market.cities.find((c) => mentionsCity(prominentText, c))
      if (named) add(2, `${named} in the page title or H1`)
    }
    if (langRegion === (market.code === 'GB' ? 'GB' : market.code)) {
      add(WEAK_LANG.has(market.code) ? 1 : 2, `Page language ${page.lang}`)
    }
    return { market, score, reasons }
  }).sort((a, b) => b.score - a.score)

  const [best, runnerUp] = evidence
  if (!best || best.score < MIN_SCORE) return null
  // Too close to call (e.g. US vs Canada on a +1 number alone): don't guess.
  if (runnerUp && best.score - runnerUp.score < 2) return null
  return { code: best.market.code, name: best.market.name, basis: best.reasons.join(', ') }
}
