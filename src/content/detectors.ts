/**
 * Website-sales detectors used by the content script. Everything is read from
 * the rendered page or the browser's own Performance API — no network calls.
 */
import type { DesignSignals, FreshnessSignals, PerformanceSignals, TechCategory, TechItem } from '../types/page'

/* ------------------------------------------------------------------ */
/* Technology                                                          */
/* ------------------------------------------------------------------ */

interface TechContext {
  srcs: string[]
  generator: string
  has(selector: string): boolean
}

interface TechRule {
  name: string
  category: TechCategory
  /** Returns false when not detected, true when detected, or a version string. */
  detect(ctx: TechContext): boolean | string
  /** Given a version, is it out of date? */
  outdated?(version: string): boolean
}

const major = (v: string) => Number.parseInt(v.split('.')[0] ?? '', 10)

function srcVersion(ctx: TechContext, pattern: RegExp): string | true | false {
  for (const src of ctx.srcs) {
    const match = src.match(pattern)
    if (match) return match[1] ?? true
  }
  return false
}

const TECH_RULES: TechRule[] = [
  {
    name: 'WordPress',
    category: 'cms',
    detect: (c) => {
      const gen = c.generator.match(/WordPress\s*([\d.]+)?/i)
      if (gen) return gen[1] ?? true
      return c.srcs.some((s) => /\/wp-(content|includes)\//.test(s))
    },
    outdated: (v) => major(v) < 6,
  },
  { name: 'WooCommerce', category: 'ecommerce', detect: (c) => c.has('.woocommerce, .woocommerce-page') || c.srcs.some((s) => /woocommerce/.test(s)) },
  {
    name: 'Elementor',
    category: 'builder',
    detect: (c) => c.generator.match(/Elementor\s*([\d.]+)/i)?.[1] ?? c.has('[data-elementor-type], .elementor-section, .elementor-element'),
  },
  { name: 'Divi', category: 'builder', detect: (c) => c.has('#et-main-area, .et_pb_section') },
  { name: 'Wix', category: 'builder', detect: (c) => /wix/i.test(c.generator) || c.srcs.some((s) => /wixstatic\.com|parastorage\.com/.test(s)) },
  { name: 'Squarespace', category: 'builder', detect: (c) => /squarespace/i.test(c.generator) || c.srcs.some((s) => /squarespace(-cdn)?\.com/.test(s)) },
  { name: 'Shopify', category: 'ecommerce', detect: (c) => c.srcs.some((s) => /cdn\.shopify\.com|shopifycdn|myshopify\.com/.test(s)) },
  { name: 'Webflow', category: 'builder', detect: (c) => c.has('html[data-wf-site]') || c.srcs.some((s) => /webflow/.test(s)) },
  {
    name: 'Framer',
    category: 'builder',
    // The generator value is a build hash (e.g. "Framer 74b9e1d"), not a version, so report presence only.
    detect: (c) =>
      /framer/i.test(c.generator) ||
      c.has('[data-framer-root], [data-framer-component-type]') ||
      c.srcs.some((s) => /framerusercontent\.com|events\.framer\.com/.test(s)),
  },
  { name: 'GoDaddy Website Builder', category: 'builder', detect: (c) => /godaddy|starfield/i.test(c.generator) || c.srcs.some((s) => /img\d?\.wsimg\.com/.test(s)) },
  { name: 'Duda', category: 'builder', detect: (c) => c.srcs.some((s) => /multiscreensite|dudamobile|cdn-website\.com/.test(s)) },
  { name: 'Weebly', category: 'builder', detect: (c) => c.srcs.some((s) => /weebly\.com|editmysite\.com/.test(s)) },
  { name: 'Joomla', category: 'cms', detect: (c) => /joomla/i.test(c.generator) || c.srcs.some((s) => /\/media\/jui\//.test(s)) },
  {
    name: 'Drupal',
    category: 'cms',
    detect: (c) => c.generator.match(/Drupal\s*(\d+)/i)?.[1] ?? c.srcs.some((s) => /\/sites\/(default|all)\/(files|themes|modules)\//.test(s)),
    outdated: (v) => major(v) < 9,
  },
  { name: 'Ghost', category: 'cms', detect: (c) => /ghost/i.test(c.generator) },
  { name: 'HubSpot CMS', category: 'cms', detect: (c) => /hubspot/i.test(c.generator) || c.srcs.some((s) => /hubspotusercontent|hs-sites\.com/.test(s)) },
  { name: 'BigCommerce', category: 'ecommerce', detect: (c) => c.srcs.some((s) => /bigcommerce\.com/.test(s)) },
  { name: 'Magento', category: 'ecommerce', detect: (c) => c.srcs.some((s) => /\/static\/version\d+\/|\/mage\//.test(s)) },
  { name: 'Next.js', category: 'framework', detect: (c) => c.has('#__next') || c.srcs.some((s) => /\/_next\//.test(s)) },
  { name: 'Nuxt', category: 'framework', detect: (c) => c.has('#__nuxt') || c.srcs.some((s) => /\/_nuxt\//.test(s)) },
  { name: 'Gatsby', category: 'framework', detect: (c) => c.has('#___gatsby') },
  {
    name: 'Angular',
    category: 'framework',
    detect: () => document.querySelector('[ng-version]')?.getAttribute('ng-version') ?? false,
  },
  { name: 'AngularJS (legacy)', category: 'legacy', detect: (c) => c.has('[ng-app], [data-ng-app]') && !c.has('[ng-version]') },
  { name: 'Vue', category: 'framework', detect: (c) => c.has('[data-v-app], [data-server-rendered]') || c.srcs.some((s) => /vue(\.runtime)?(\.global)?(\.min)?\.js/.test(s)) },
  {
    name: 'React',
    category: 'framework',
    // Markup-only signs; the tab service also checks the page's own JavaScript.
    detect: (c) =>
      c.has('[data-reactroot], [data-reactid], #__next, #___gatsby') ||
      c.srcs.some((s) => /react(-dom)?(\.production|\.development)?(\.min)?\.js|\/react(-dom)?@\d/.test(s)),
  },
  { name: 'Svelte', category: 'framework', detect: (c) => c.has('[class*="svelte-"]') },
  {
    name: 'jQuery',
    category: 'library',
    detect: (c) =>
      srcVersion(c, /jquery(?:\.min)?\.js\?ver=(\d+\.\d+(?:\.\d+)?)/i) ||
      srcVersion(c, /jquery[-.@/]?(\d+\.\d+(?:\.\d+)?)(?:\.min)?\.js/i) ||
      srcVersion(c, /\/jquery(?:\.min)?\.js/i),
    outdated: (v) => major(v) < 3,
  },
  {
    name: 'Bootstrap',
    category: 'css',
    detect: (c) => srcVersion(c, /bootstrap[@/-]?(\d+\.\d+(?:\.\d+)?)/i) || srcVersion(c, /bootstrap(?:\.min)?\.(?:css|js)/i),
    outdated: (v) => major(v) < 4,
  },
  { name: 'Tailwind CSS', category: 'css', detect: (c) => c.has('[class*="md\\:"], [class*="lg\\:"]') },
  { name: 'Font Awesome', category: 'fonts', detect: (c) => srcVersion(c, /font-?awesome[@/-]?(\d+\.\d+(?:\.\d+)?)/i) || srcVersion(c, /font-?awesome|fontawesome/i) },
  { name: 'Google Fonts', category: 'fonts', detect: (c) => c.srcs.some((s) => /fonts\.(googleapis|gstatic)\.com/.test(s)) },
  { name: 'Adobe Fonts', category: 'fonts', detect: (c) => c.srcs.some((s) => /use\.typekit\.net/.test(s)) },
  { name: 'HubSpot', category: 'marketing', detect: (c) => c.srcs.some((s) => /js\.hs-scripts\.com|js\.hsforms\.net/.test(s)) },
  { name: 'Cloudflare', category: 'cdn', detect: (c) => c.srcs.some((s) => /\/cdn-cgi\//.test(s)) },
  // Site builders, themes and CMSs
  { name: 'Beaver Builder', category: 'builder', detect: (c) => c.has('.fl-builder-content') },
  { name: 'WPBakery', category: 'builder', detect: (c) => c.has('.vc_row, .wpb_row') || /WPBakery/i.test(c.generator) },
  { name: 'Avada', category: 'builder', detect: (c) => c.has('.fusion-builder-row') || c.srcs.some((s) => /\/themes\/Avada\//.test(s)) },
  { name: 'Bricks', category: 'builder', detect: (c) => c.has('[class*="brxe-"]') },
  { name: 'Oxygen', category: 'builder', detect: (c) => c.has('.ct-section') },
  { name: 'Astra', category: 'builder', detect: (c) => c.srcs.some((s) => /\/themes\/astra\//.test(s)) },
  { name: 'Blogger', category: 'cms', detect: (c) => /blogger/i.test(c.generator) || c.srcs.some((s) => /blogger\.googleusercontent\.com|blogblog\.com/.test(s)) },
  { name: 'Tilda', category: 'builder', detect: (c) => /tilda/i.test(c.generator) || c.srcs.some((s) => /tildacdn\.com/.test(s)) },
  { name: 'Jimdo', category: 'builder', detect: (c) => c.srcs.some((s) => /jimdo(cdn|static)?\.com/.test(s)) },
  { name: 'Strikingly', category: 'builder', detect: (c) => c.srcs.some((s) => /strikingly(cdn)?\.com/.test(s)) },
  { name: 'Carrd', category: 'builder', detect: (c) => c.srcs.some((s) => /carrd\.co\//.test(s)) },
  { name: 'Hostinger Website Builder', category: 'builder', detect: (c) => /zyro|hostinger/i.test(c.generator) || c.srcs.some((s) => /zyrosite\.com/.test(s)) },
  { name: 'Site123', category: 'builder', detect: (c) => c.srcs.some((s) => /site123\.(com|me)/.test(s)) },
  { name: 'Webnode', category: 'builder', detect: (c) => /webnode/i.test(c.generator) || c.srcs.some((s) => /webnode\./.test(s)) },
  { name: 'Umbraco', category: 'cms', detect: (c) => c.srcs.some((s) => /\/umbraco\//.test(s)) },
  { name: 'Craft CMS', category: 'cms', detect: (c) => /craft cms/i.test(c.generator) },
  { name: 'TYPO3', category: 'cms', detect: (c) => /typo3/i.test(c.generator) || c.srcs.some((s) => /\/typo3(conf|temp)\//.test(s)) },
  { name: 'Concrete CMS', category: 'cms', detect: (c) => /concrete/i.test(c.generator) || c.srcs.some((s) => /\/concrete\/(js|css)\//.test(s)) },
  { name: 'Sitecore', category: 'cms', detect: (c) => c.srcs.some((s) => /\/-\/media\//.test(s)) },
  { name: 'Adobe Experience Manager', category: 'cms', detect: (c) => c.srcs.some((s) => /\/etc\.clientlibs\//.test(s)) },
  { name: 'Sanity', category: 'cms', detect: (c) => c.srcs.some((s) => /cdn\.sanity\.io/.test(s)) },
  { name: 'Contentful', category: 'cms', detect: (c) => c.srcs.some((s) => /ctfassets\.net/.test(s)) },
  { name: 'Storyblok', category: 'cms', detect: (c) => c.srcs.some((s) => /a\.storyblok\.com/.test(s)) },
  { name: 'Prismic', category: 'cms', detect: (c) => c.srcs.some((s) => /images\.prismic\.io/.test(s)) },
  // E-commerce
  { name: 'Neto (Maropost)', category: 'ecommerce', detect: (c) => c.srcs.some((s) => /netocdn\.net|neto\.com\.au/.test(s)) },
  { name: 'PrestaShop', category: 'ecommerce', detect: (c) => /prestashop/i.test(c.generator) || c.srcs.some((s) => /\/modules\/ps_/.test(s)) },
  { name: 'OpenCart', category: 'ecommerce', detect: (c) => c.srcs.some((s) => /catalog\/view\/(theme|javascript)\//.test(s)) },
  { name: 'Ecwid', category: 'ecommerce', detect: (c) => c.srcs.some((s) => /app\.ecwid\.com/.test(s)) },
  { name: 'Salesforce Commerce Cloud', category: 'ecommerce', detect: (c) => c.srcs.some((s) => /demandware\.(static|net)/.test(s)) },
  { name: 'Square Online', category: 'ecommerce', detect: (c) => c.srcs.some((s) => /square\.site/.test(s)) },
  // Frameworks and libraries
  { name: 'Astro', category: 'framework', detect: (c) => c.has('astro-island') || /astro/i.test(c.generator) },
  { name: 'SvelteKit', category: 'framework', detect: (c) => c.has('[data-sveltekit-preload-data], [data-sveltekit-reload]') || c.srcs.some((s) => /\/_app\/immutable\//.test(s)) },
  { name: 'Remix', category: 'framework', detect: (c) => c.srcs.some((s) => /\/build\/_shared\//.test(s)) },
  { name: 'Qwik', category: 'framework', detect: (c) => c.has('[q\\:container]') },
  { name: 'Ember', category: 'framework', detect: (c) => c.has('.ember-view') },
  { name: 'Alpine.js', category: 'library', detect: (c) => c.has('[x-data]') },
  { name: 'htmx', category: 'library', detect: (c) => c.has('[hx-get], [hx-post], [hx-boost]') },
  { name: 'GSAP', category: 'library', detect: (c) => c.srcs.some((s) => /gsap(\.min)?\.js|\/gsap@|greensock/i.test(s)) },
  { name: 'Swiper', category: 'library', detect: (c) => c.has('.swiper-wrapper') },
  { name: 'Slick', category: 'library', detect: (c) => c.has('.slick-slider') },
  { name: 'Three.js', category: 'library', detect: (c) => c.srcs.some((s) => /three(\.module)?(\.min)?\.js|\/three@/.test(s)) },
  { name: 'Lottie', category: 'library', detect: (c) => c.has('lottie-player, dotlottie-player') || c.srcs.some((s) => /lottie/i.test(s)) },
  { name: 'Foundation', category: 'css', detect: (c) => c.srcs.some((s) => /foundation(\.min)?\.(css|js)/.test(s)) },
  { name: 'Bulma', category: 'css', detect: (c) => c.srcs.some((s) => /bulma(\.min)?\.css|\/bulma@/.test(s)) },
  { name: 'Vimeo', category: 'library', detect: (c) => c.srcs.some((s) => /player\.vimeo\.com/.test(s)) },
  { name: 'YouTube embed', category: 'library', detect: (c) => c.srcs.some((s) => /youtube(-nocookie)?\.com\/embed/.test(s)) },
  { name: 'Google Maps', category: 'library', detect: (c) => c.srcs.some((s) => /maps\.googleapis\.com|google\.com\/maps\/embed/.test(s)) },
  // Booking, chat and payments
  { name: 'Calendly', category: 'booking', detect: (c) => c.srcs.some((s) => /calendly\.com/.test(s)) || c.has('.calendly-inline-widget') },
  { name: 'Fresha', category: 'booking', detect: (c) => c.srcs.some((s) => /fresha\.com/.test(s)) },
  { name: 'Mindbody', category: 'booking', detect: (c) => c.srcs.some((s) => /mindbodyonline\.com|healcode\.com/.test(s)) },
  { name: 'Cliniko', category: 'booking', detect: (c) => c.srcs.some((s) => /cliniko\.com/.test(s)) },
  { name: 'HotDoc', category: 'booking', detect: (c) => c.srcs.some((s) => /hotdoc\.com\.au/.test(s)) },
  { name: 'Timely', category: 'booking', detect: (c) => c.srcs.some((s) => /gettimely\.com/.test(s)) },
  { name: 'SimplyBook.me', category: 'booking', detect: (c) => c.srcs.some((s) => /simplybook\.(me|it|asia)/.test(s)) },
  { name: 'Acuity Scheduling', category: 'booking', detect: (c) => c.srcs.some((s) => /acuityscheduling\.com/.test(s)) },
  { name: 'Setmore', category: 'booking', detect: (c) => c.srcs.some((s) => /setmore\.com/.test(s)) },
  { name: 'OpenTable', category: 'booking', detect: (c) => c.srcs.some((s) => /opentable\.com/.test(s)) },
  { name: 'Intercom', category: 'chat', detect: (c) => c.srcs.some((s) => /widget\.intercom\.io|intercomcdn\.com/.test(s)) },
  { name: 'Tawk.to', category: 'chat', detect: (c) => c.srcs.some((s) => /embed\.tawk\.to/.test(s)) },
  { name: 'Zendesk Chat', category: 'chat', detect: (c) => c.srcs.some((s) => /static\.zdassets\.com|zopim/.test(s)) },
  { name: 'LiveChat', category: 'chat', detect: (c) => c.srcs.some((s) => /cdn\.livechatinc\.com/.test(s)) },
  { name: 'Tidio', category: 'chat', detect: (c) => c.srcs.some((s) => /code\.tidio\.co/.test(s)) },
  { name: 'Crisp', category: 'chat', detect: (c) => c.srcs.some((s) => /client\.crisp\.chat/.test(s)) },
  { name: 'Drift', category: 'chat', detect: (c) => c.srcs.some((s) => /js\.driftt\.com/.test(s)) },
  { name: 'Stripe', category: 'payments', detect: (c) => c.srcs.some((s) => /js\.stripe\.com/.test(s)) },
  { name: 'PayPal', category: 'payments', detect: (c) => c.srcs.some((s) => /paypal\.com\/sdk|paypalobjects\.com/.test(s)) },
  { name: 'Afterpay', category: 'payments', detect: (c) => c.srcs.some((s) => /afterpay/i.test(s)) },
  { name: 'Zip Pay', category: 'payments', detect: (c) => c.srcs.some((s) => /zipmoney|static\.zip\.co/.test(s)) },
  // Marketing tools
  { name: 'Mailchimp', category: 'marketing', detect: (c) => c.srcs.some((s) => /chimpstatic\.com|list-manage\.com/.test(s)) },
  { name: 'Klaviyo', category: 'marketing', detect: (c) => c.srcs.some((s) => /klaviyo\.com/.test(s)) },
  { name: 'ActiveCampaign', category: 'marketing', detect: (c) => c.srcs.some((s) => /activehosted\.com|trackcmp\.net/.test(s)) },
  { name: 'Gravity Forms', category: 'marketing', detect: (c) => c.has('.gform_wrapper') },
  { name: 'Contact Form 7', category: 'marketing', detect: (c) => c.has('.wpcf7') },
  { name: 'Jotform', category: 'marketing', detect: (c) => c.srcs.some((s) => /jotform\.(com|net)/.test(s)) },
  { name: 'Typeform', category: 'marketing', detect: (c) => c.srcs.some((s) => /typeform\.com/.test(s)) },
  { name: 'Cookiebot', category: 'marketing', detect: (c) => c.srcs.some((s) => /consent\.cookiebot\.com/.test(s)) },
  { name: 'OneTrust', category: 'marketing', detect: (c) => c.srcs.some((s) => /cdn\.cookielaw\.org/.test(s)) },
  { name: 'Flash', category: 'legacy', detect: (c) => c.has('object[type*="flash"], embed[src$=".swf"], object[data$=".swf"]') },
]

export function detectTech(): TechItem[] {
  const srcs = [
    ...Array.from(document.querySelectorAll<HTMLScriptElement>('script[src]'), (s) => s.src),
    ...Array.from(document.querySelectorAll<HTMLLinkElement>('link[href]'), (l) => l.href),
    ...Array.from(document.images, (i) => i.currentSrc || i.src).slice(0, 80),
    // Booking and chat widgets are often embedded as iframes.
    ...Array.from(document.querySelectorAll<HTMLIFrameElement>('iframe[src]'), (f) => f.src),
  ].slice(0, 600)
  const generator = Array.from(document.querySelectorAll<HTMLMetaElement>('meta[name="generator" i]'), (m) => m.content).join(' | ')
  const ctx: TechContext = { srcs, generator, has: (selector) => document.querySelector(selector) !== null }

  const found: TechItem[] = []
  for (const rule of TECH_RULES) {
    let result: boolean | string = false
    try {
      result = rule.detect(ctx)
    } catch {
      result = false
    }
    if (!result) continue
    const version = typeof result === 'string' ? result : null
    found.push({ name: rule.name, category: rule.category, version, outdated: Boolean(version && rule.outdated?.(version)) || rule.category === 'legacy' })
  }
  return found
}

/* ------------------------------------------------------------------ */
/* Performance (Core Web Vitals from the user's own visit)             */
/* ------------------------------------------------------------------ */

function bufferedEntries(type: string, waitMs = 150): Promise<PerformanceEntry[]> {
  return new Promise((resolve) => {
    const entries: PerformanceEntry[] = []
    try {
      const observer = new PerformanceObserver((list) => entries.push(...list.getEntries()))
      observer.observe({ type, buffered: true })
      setTimeout(() => {
        observer.disconnect()
        resolve(entries)
      }, waitMs)
    } catch {
      resolve(entries)
    }
  })
}

const round = (n: number | undefined | null) => (n === undefined || n === null || !Number.isFinite(n) || n <= 0 ? null : Math.round(n))

export async function measurePerformance(): Promise<PerformanceSignals> {
  const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
  const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
  const [lcpEntries, shiftEntries] = await Promise.all([
    bufferedEntries('largest-contentful-paint'),
    bufferedEntries('layout-shift'),
  ])

  const lcp = lcpEntries.at(-1)
  let cls = 0
  for (const entry of shiftEntries as (PerformanceEntry & { value?: number; hadRecentInput?: boolean })[]) {
    if (!entry.hadRecentInput) cls += entry.value ?? 0
  }
  const bytes =
    (nav ? Math.max(nav.transferSize, nav.encodedBodySize) : 0) +
    resources.reduce((sum, r) => sum + Math.max(r.transferSize, r.encodedBodySize), 0)

  return {
    measured: Boolean(nav),
    ttfbMs: round(nav?.responseStart),
    domContentLoadedMs: round(nav?.domContentLoadedEventEnd),
    loadMs: round(nav?.loadEventEnd),
    lcpMs: round(lcp?.startTime),
    cls: shiftEntries.length ? Math.round(cls * 1000) / 1000 : lcpEntries.length ? 0 : null,
    pageWeightKb: bytes > 0 ? Math.round(bytes / 1024) : null,
    requestCount: resources.length + (nav ? 1 : 0),
    scriptCount: document.scripts.length,
  }
}

/* ------------------------------------------------------------------ */
/* Design & responsiveness                                             */
/* ------------------------------------------------------------------ */

function countResponsiveMediaQueries(): number | null {
  let readable = 0
  let count = 0
  let scanned = 0
  for (const sheet of Array.from(document.styleSheets)) {
    let rules: CSSRuleList
    try {
      rules = sheet.cssRules
    } catch {
      continue // cross-origin stylesheet
    }
    readable++
    for (const rule of Array.from(rules)) {
      if (++scanned > 8000) break
      if (rule instanceof CSSMediaRule && /width/.test(rule.conditionText)) count++
    }
  }
  count += document.querySelectorAll('link[rel="stylesheet"][media*="width"]').length
  return readable === 0 && count === 0 ? null : count
}

export function designSignals(): DesignSignals {
  const images = Array.from(document.images)
  const modernImages =
    images.filter((img) => /\.(webp|avif)(\?|#|$)/i.test(img.currentSrc || img.src)).length +
    document.querySelectorAll('picture source[type="image/webp"], picture source[type="image/avif"]').length

  const fonts = new Set<string>()
  try {
    document.fonts.forEach((face) => {
      const family = face.family.replace(/["']/g, '').trim()
      if (family && !/icon|awesome|dashicons|eicons|glyph|icomoon|fontello|feather|ionicons|material symbols/i.test(family)) fonts.add(family)
    })
  } catch {
    // FontFaceSet iteration unsupported
  }

  const sample = Array.from(document.body?.querySelectorAll('*') ?? []).slice(0, 400)
  const usesFlexOrGrid = sample.some((el) => /flex|grid/.test(getComputedStyle(el).display))

  const layoutTables = Array.from(document.querySelectorAll('table')).filter(
    (t) => !t.querySelector('th') && t.querySelector('img, table') && t.offsetWidth > window.innerWidth * 0.5,
  ).length

  const textEl = document.querySelector('main p, article p, p') ?? document.body
  const baseFont = textEl ? Number.parseFloat(getComputedStyle(textEl).fontSize) : Number.NaN

  return {
    modernImages,
    lazyImages: images.filter((img) => img.loading === 'lazy').length,
    svgCount: document.querySelectorAll('svg').length + images.filter((i) => /\.svg(\?|$)/i.test(i.src)).length,
    webFonts: Array.from(fonts).slice(0, 6),
    usesFlexOrGrid,
    legacyTags: document.querySelectorAll('font, center, marquee, blink, frameset, frame, big, tt').length,
    layoutTables,
    flash: document.querySelector('object[type*="flash"], embed[src$=".swf"], object[data$=".swf"]') !== null,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 5,
    mediaQueries: countResponsiveMediaQueries(),
    baseFontPx: Number.isFinite(baseFont) ? Math.round(baseFont * 10) / 10 : null,
    viewportWidth: window.innerWidth,
  }
}

/* ------------------------------------------------------------------ */
/* Freshness ("when was it last updated?")                             */
/* ------------------------------------------------------------------ */

export function freshnessSignals(bodyText: string, schemaDateModified: string | null): FreshnessSignals {
  const currentYear = new Date().getFullYear()
  const footerText = Array.from(document.querySelectorAll('footer'), (f) => f.textContent ?? '').join(' ') + ' ' + bodyText.slice(-4000)
  let copyrightYear: number | null = null
  for (const match of footerText.matchAll(/(?:©|&copy;|\(c\)|copyright)\s*(?:\d{4}\s*[-–—]\s*)?(\d{4})/gi)) {
    const year = Number(match[1])
    if (year >= 1995 && year <= currentYear + 1 && (copyrightYear === null || year > copyrightYear)) copyrightYear = year
  }

  const meta = (sel: string) => document.querySelector<HTMLMetaElement>(sel)?.content?.trim() || null
  const modifiedMeta =
    meta('meta[property="article:modified_time"]') ??
    meta('meta[property="og:updated_time"]') ??
    meta('meta[name="last-modified" i]') ??
    schemaDateModified

  // document.lastModified is "now" for dynamically generated pages; ignore that case.
  const lastModified = Date.parse(document.lastModified)
  const serverLastModified =
    Number.isFinite(lastModified) && Date.now() - lastModified > 2 * 86_400_000 ? new Date(lastModified).toISOString() : null

  return { copyrightYear, modifiedMeta, serverLastModified }
}
