/**
 * Pattern → friendly provider name. Used to translate nameservers, IP network
 * owners and MX hosts into names a salesperson recognises. First match wins.
 */
type ProviderMap = [RegExp, string][]

export const DNS_PROVIDERS: ProviderMap = [
  [/awsdns/i, 'Amazon Route 53 (AWS)'],
  [/cloudflare/i, 'Cloudflare'],
  [/domaincontrol\.com/i, 'GoDaddy'],
  [/registrar-servers\.com/i, 'Namecheap'],
  [/hostinger|dns-parking\.com/i, 'Hostinger'],
  [/googledomains|google\.com|ns-cloud/i, 'Google Cloud DNS'],
  [/azure-dns/i, 'Microsoft Azure DNS'],
  [/wixdns/i, 'Wix'],
  [/squarespace/i, 'Squarespace'],
  [/shopify/i, 'Shopify'],
  [/vercel-dns/i, 'Vercel'],
  [/nsone\.net/i, 'NS1'],
  [/ventraip|nameserver\.net\.au/i, 'VentraIP'],
  [/crazydomains/i, 'Crazy Domains'],
  [/netregistry/i, 'Netregistry'],
  [/melbourneit/i, 'Melbourne IT'],
  [/digitalpacific/i, 'Digital Pacific'],
  [/synergywholesale/i, 'Synergy Wholesale'],
  [/zuver/i, 'Zuver'],
  [/panthur/i, 'Panthur'],
  [/siteground/i, 'SiteGround'],
  [/bluehost/i, 'Bluehost'],
  [/websitewelcome/i, 'HostGator'],
  [/dreamhost/i, 'DreamHost'],
  [/digitalocean/i, 'DigitalOcean'],
  [/linode/i, 'Linode (Akamai)'],
  [/worldnic|web\.com/i, 'Network Solutions / Web.com'],
  [/dnsmadeeasy/i, 'DNS Made Easy'],
]

/** IP network owners that are CDNs/proxies: the real origin host is hidden. */
export const CDN_OWNERS: ProviderMap = [
  [/cloudflare/i, 'Cloudflare'],
  [/amazo-cf|cloudfront/i, 'Amazon CloudFront'],
  [/fastly/i, 'Fastly'],
  [/akamai/i, 'Akamai'],
  [/incapsula|imperva/i, 'Imperva'],
  [/sucuri/i, 'Sucuri'],
]

export const HOSTING_OWNERS: ProviderMap = [
  [/amazon|aws/i, 'Amazon Web Services (AWS)'],
  [/google/i, 'Google Cloud'],
  [/microsoft|azure/i, 'Microsoft Azure'],
  [/vercel/i, 'Vercel'],
  [/netlify/i, 'Netlify'],
  [/hostinger/i, 'Hostinger'],
  [/siteground/i, 'SiteGround'],
  [/godaddy|go daddy|secureserver/i, 'GoDaddy'],
  [/unified ?layer|newfold|bluehost|endurance/i, 'Bluehost / Newfold Digital'],
  [/websitewelcome|hostgator/i, 'HostGator'],
  [/digitalocean/i, 'DigitalOcean'],
  [/linode/i, 'Linode (Akamai)'],
  [/hetzner/i, 'Hetzner'],
  [/ovh/i, 'OVHcloud'],
  [/vultr|choopa/i, 'Vultr'],
  [/a2 ?hosting/i, 'A2 Hosting'],
  [/dreamhost/i, 'DreamHost'],
  [/liquid ?web/i, 'Liquid Web'],
  [/wp ?engine/i, 'WP Engine'],
  [/automattic/i, 'WordPress.com (Automattic)'],
  [/wix/i, 'Wix'],
  [/squarespace/i, 'Squarespace'],
  [/shopify/i, 'Shopify'],
  [/framer/i, 'Framer'],
  [/ventra/i, 'VentraIP'],
  [/dreamscape|crazy ?domains/i, 'Crazy Domains (Dreamscape)'],
  [/netregistry|arq group|melbourne ?it/i, 'Netregistry / Arq Group'],
  [/digital ?pacific/i, 'Digital Pacific'],
  [/servers ?australia/i, 'Servers Australia'],
  [/synergy ?wholesale/i, 'Synergy Wholesale'],
  [/panthur/i, 'Panthur'],
  [/micron21/i, 'Micron21'],
  [/rackspace/i, 'Rackspace'],
]

export const EMAIL_PROVIDERS: ProviderMap = [
  [/google\.com|googlemail\.com/i, 'Google Workspace'],
  [/outlook\.com|protection\.outlook/i, 'Microsoft 365'],
  [/zoho/i, 'Zoho Mail'],
  [/mimecast/i, 'Mimecast'],
  [/secureserver\.net/i, 'GoDaddy Email'],
  [/hostinger/i, 'Hostinger Email'],
  [/messagingengine\.com/i, 'Fastmail'],
  [/icloud\.com/i, 'iCloud Mail'],
]

/** Site builders that host the website themselves. */
export const HOSTED_PLATFORMS = ['Shopify', 'Wix', 'Squarespace', 'Webflow', 'Framer', 'GoDaddy Website Builder', 'Duda', 'Weebly', 'BigCommerce']

export function matchProvider(map: ProviderMap, value: string | null | undefined): string | null {
  if (!value) return null
  return map.find(([pattern]) => pattern.test(value))?.[1] ?? null
}

/** Second-level public suffixes, so "www.example.com.au" → "example.com.au". */
const SECOND_LEVEL = /\.(com|net|org|edu|gov|asn|id|co|ac|govt|ltd|plc|me)\.(au|nz|uk|za|sg|my|in|jp|kr|br|mx)$/i

export function registrableDomain(host: string): string {
  const clean = host.toLowerCase().replace(/^www\./, '').replace(/\.$/, '')
  const parts = clean.split('.')
  const keep = SECOND_LEVEL.test(clean) ? 3 : 2
  return parts.slice(-keep).join('.')
}
