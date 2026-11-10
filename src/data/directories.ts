import { registrableDomain } from './providers'

/**
 * Sites that rank for almost every local search but aren't direct competitors:
 * directories, marketplaces, social networks, reference and review sites.
 * Compared by registrable domain, so subdomains are covered.
 */
const DIRECTORY_DOMAINS = new Set([
  'yellowpages.com.au',
  'truelocal.com.au',
  'hipages.com.au',
  'oneflare.com.au',
  'serviceseeking.com.au',
  'airtasker.com',
  'localsearch.com.au',
  'startlocal.com.au',
  'hotfrog.com.au',
  'yelp.com',
  'yelp.com.au',
  'productreview.com.au',
  'wordofmouth.com.au',
  'tripadvisor.com.au',
  'tripadvisor.com',
  'healthengine.com.au',
  'hotdoc.com.au',
  'whitecoat.com.au',
  'healthdirect.gov.au',
  'realestate.com.au',
  'domain.com.au',
  'gumtree.com.au',
  'seek.com.au',
  'indeed.com',
  'facebook.com',
  'instagram.com',
  'linkedin.com',
  'youtube.com',
  'tiktok.com',
  'pinterest.com',
  'pinterest.com.au',
  'x.com',
  'twitter.com',
  'reddit.com',
  'quora.com',
  'wikipedia.org',
  'amazon.com.au',
  'ebay.com.au',
  'apple.com',
  'bing.com',
  'zomato.com',
  'opentable.com.au',
  'booking.com',
  'expedia.com.au',
  'carsales.com.au',
  'canstar.com.au',
  'finder.com.au',
  'choice.com.au',
  // Outside Australia.
  'yell.com',
  'checkatrade.com',
  'trustatrader.com',
  'mybuilder.com',
  'ratedpeople.com',
  'bark.com',
  'thomsonlocal.com',
  'freeindex.co.uk',
  'trustpilot.com',
  'yelp.co.uk',
  'yelp.ca',
  'yelp.ie',
  'tripadvisor.co.uk',
  'tripadvisor.ca',
  'tripadvisor.in',
  'bbb.org',
  'angi.com',
  'homeadvisor.com',
  'thumbtack.com',
  'houzz.com',
  'nextdoor.com',
  'mapquest.com',
  'yellowpages.com',
  'yellowpages.ca',
  'yellow.co.nz',
  'finda.co.nz',
  'builderscrack.co.nz',
  'nocowboys.co.nz',
  'goldenpages.ie',
  'justdial.com',
  'sulekha.com',
  'indiamart.com',
  'practo.com',
  'zocdoc.com',
  'healthgrades.com',
  'webmd.com',
  'opentable.com',
  'opentable.co.uk',
  'booking.com',
  'amazon.com',
  'amazon.co.uk',
  'amazon.in',
  'ebay.com',
  'ebay.co.uk',
  'gumtree.com',
  'craigslist.org',
  'indeed.co.uk',
  'glassdoor.com',
])

export function rootDomain(url: string): string {
  try {
    return registrableDomain(new URL(url).hostname)
  } catch {
    return url
  }
}

export function matchesDomain(a: string, b: string): boolean {
  return registrableDomain(a) === registrableDomain(b)
}

export function isDirectoryDomain(domain: string): boolean {
  // Government and public-health sites rank widely but aren't competitors.
  return DIRECTORY_DOMAINS.has(registrableDomain(domain)) || /\.(gov(\.[a-z]{2})?|gc\.ca|nhs\.uk|govt\.nz)$/.test(domain)
}
