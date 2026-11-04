import type { PageExtraction } from '../types/page'

/**
 * DEMO DATA. Three fictional businesses expressed as page extractions, so
 * Demo Mode exercises the exact same analysis engine as a live scan. Domains
 * use the reserved ".example" TLD and phone numbers use the fictional 5550
 * range; none of this represents a real company.
 */
export interface DemoBusiness {
  id: string
  name: string
  city: string
  description: string
  /** Shown as a sample "recent analysis" on first run. */
  sampleAgeMinutes: number
  page: PageExtraction
}

const NO_TRACKING = {
  googleTagManager: false,
  googleAnalytics: false,
  googleAds: false,
  metaPixel: false,
  linkedInInsight: false,
  tiktokPixel: false,
}

const EMPTY_SCHEMA = {
  types: [],
  blockCount: 0,
  name: null,
  telephone: null,
  locality: null,
  region: null,
  postcode: null,
  streetAddress: null,
}

function demoPage(page: Omit<PageExtraction, 'protocol' | 'extractedAt' | 'source' | 'truncated'>): PageExtraction {
  return { ...page, protocol: 'https', extractedAt: new Date().toISOString(), source: 'demo', truncated: false }
}

export const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    id: 'demo-dental',
    name: 'Demo Dental Co.',
    city: 'Melbourne',
    description: 'Fictional family dental clinic',
    sampleAgeMinutes: 120,
    page: demoPage({
      url: 'https://demo-dental.example/',
      domain: 'demo-dental.example',
      title: 'Demo Dental Co. | Family Dentist in Melbourne',
      lang: 'en-AU',
      metaDescription: null,
      canonical: 'https://demo-dental.example/',
      viewport: 'width=device-width, initial-scale=1',
      headings: {
        h1: ['Gentle family dentistry in Melbourne'],
        h2: ['Our services', 'Meet the team', 'Payment plans', 'Visit our clinic'],
        h3: ['Check-ups & cleans', 'Teeth whitening', 'Invisalign', 'Emergency dental'],
      },
      images: { total: 24, missingAlt: 12 },
      links: { total: 64, internal: 48, external: 9 },
      forms: { count: 1, fieldCount: 5, hasEmailField: true, hasPhoneField: true, searchOnly: false },
      buttonCount: 6,
      ctas: [
        { text: 'Book an appointment', intent: 'book', element: 'link', aboveFold: true },
        { text: 'Call us', intent: 'call', element: 'link', aboveFold: false },
        { text: 'Learn more', intent: 'learn', element: 'link', aboveFold: false },
      ],
      phones: ['(03) 5550 1234'],
      emails: ['hello@demo-dental.example'],
      socialLinks: [
        { platform: 'instagram', url: 'https://instagram.com/demo-dental-example' },
        { platform: 'facebook', url: 'https://facebook.com/demo-dental-example' },
      ],
      addressCandidates: ['100 Example Street, Melbourne VIC 3000'],
      schema: {
        types: ['Dentist'],
        blockCount: 1,
        name: 'Demo Dental Co.',
        telephone: '(03) 5550 1234',
        locality: 'Melbourne',
        region: 'VIC',
        postcode: '3000',
        streetAddress: '100 Example Street',
      },
      openGraph: {
        title: 'Demo Dental Co.',
        description: 'Gentle family dentistry in Melbourne.',
        image: 'https://demo-dental.example/og.jpg',
        siteName: null,
      },
      tracking: { ...NO_TRACKING, googleAnalytics: true },
      tech: [
        { name: 'WordPress', category: 'cms', version: '5.8.3', outdated: true },
        { name: 'jQuery', category: 'library', version: '1.12.4', outdated: true },
        { name: 'Bootstrap', category: 'css', version: '3.3.7', outdated: true },
        { name: 'Google Fonts', category: 'fonts', version: null, outdated: false },
      ],
      performance: { measured: true, ttfbMs: 980, domContentLoadedMs: 3400, loadMs: 6900, lcpMs: 4800, cls: 0.18, pageWeightKb: 4200, requestCount: 96, scriptCount: 31 },
      design: { modernImages: 0, lazyImages: 0, svgCount: 1, webFonts: ['Open Sans'], usesFlexOrGrid: false, legacyTags: 0, layoutTables: 0, flash: false, horizontalOverflow: true, mediaQueries: 4, baseFontPx: 13, viewportWidth: 1366 },
      freshness: { copyrightYear: 2021, modifiedMeta: null, serverLastModified: null },
      wordCount: 860,
    }),
  },
  {
    id: 'demo-fitness',
    name: 'Demo Fitness Studio',
    city: 'Sydney',
    description: 'Fictional boutique fitness studio',
    sampleAgeMinutes: 60 * 26,
    page: demoPage({
      url: 'https://demo-fitness.example/',
      domain: 'demo-fitness.example',
      title: 'Demo Fitness Studio — Pilates, Strength & Yoga Classes Sydney',
      lang: 'en',
      metaDescription: 'Small-group pilates, strength and yoga classes in Sydney. Start your free trial week today.',
      canonical: null,
      viewport: 'width=device-width, initial-scale=1',
      headings: {
        h1: ['Move better.', 'Train together.'],
        h2: ['Classes'],
        h3: [],
      },
      images: { total: 18, missingAlt: 3 },
      links: { total: 31, internal: 7, external: 6 },
      forms: { count: 0, fieldCount: 0, hasEmailField: false, hasPhoneField: false, searchOnly: false },
      buttonCount: 3,
      ctas: [
        { text: 'Start free trial', intent: 'start', element: 'button', aboveFold: false },
        { text: 'Learn more', intent: 'learn', element: 'link', aboveFold: true },
      ],
      phones: [],
      emails: ['team@demo-fitness.example'],
      socialLinks: [
        { platform: 'instagram', url: 'https://instagram.com/demo-fitness-example' },
        { platform: 'tiktok', url: 'https://tiktok.com/@demo-fitness-example' },
        { platform: 'youtube', url: 'https://youtube.com/@demo-fitness-example' },
      ],
      addressCandidates: [],
      schema: EMPTY_SCHEMA,
      openGraph: { title: 'Demo Fitness Studio', description: null, image: null, siteName: null },
      tracking: { ...NO_TRACKING, metaPixel: true, googleTagManager: true },
      tech: [
        { name: 'Wix', category: 'builder', version: null, outdated: false },
        { name: 'Google Fonts', category: 'fonts', version: null, outdated: false },
      ],
      performance: { measured: true, ttfbMs: 420, domContentLoadedMs: 2100, loadMs: 4300, lcpMs: 3200, cls: 0.06, pageWeightKb: 2900, requestCount: 74, scriptCount: 22 },
      design: { modernImages: 9, lazyImages: 6, svgCount: 5, webFonts: ['Montserrat'], usesFlexOrGrid: true, legacyTags: 0, layoutTables: 0, flash: false, horizontalOverflow: false, mediaQueries: null, baseFontPx: 16, viewportWidth: 1366 },
      freshness: { copyrightYear: new Date().getFullYear() - 1, modifiedMeta: null, serverLastModified: null },
      wordCount: 240,
    }),
  },
  {
    id: 'demo-retail',
    name: 'Demo Retail Brand',
    city: 'Brisbane',
    description: 'Fictional homewares retailer',
    sampleAgeMinutes: 60 * 50,
    page: demoPage({
      url: 'https://demo-retail.example/',
      domain: 'demo-retail.example',
      title: 'Demo Retail Brand | Homewares, Lighting & Decor',
      lang: 'en-AU',
      metaDescription: 'Shop considered homewares, lighting and decor. Free shipping on orders over $100 and in-store pickup at our Brisbane store.',
      canonical: 'https://demo-retail.example/',
      viewport: 'width=device-width, initial-scale=1',
      headings: {
        h1: ['New season homewares'],
        h2: ['Shop by room', 'New arrivals', 'Visit our Brisbane store', 'Free shipping over $100'],
        h3: ['Living', 'Dining', 'Bedroom', 'Outdoor', 'Lighting'],
      },
      images: { total: 46, missingAlt: 2 },
      links: { total: 140, internal: 118, external: 8 },
      forms: { count: 2, fieldCount: 2, hasEmailField: true, hasPhoneField: false, searchOnly: false },
      buttonCount: 22,
      ctas: [
        { text: 'Shop now', intent: 'shop', element: 'link', aboveFold: true },
        { text: 'Add to cart', intent: 'shop', element: 'button', aboveFold: false },
        { text: 'Subscribe', intent: 'subscribe', element: 'button', aboveFold: false },
      ],
      phones: [],
      emails: ['care@demo-retail.example'],
      socialLinks: [
        { platform: 'instagram', url: 'https://instagram.com/demo-retail-example' },
        { platform: 'facebook', url: 'https://facebook.com/demo-retail-example' },
        { platform: 'tiktok', url: 'https://tiktok.com/@demo-retail-example' },
      ],
      addressCandidates: ['Shop 12, 1 Sample Lane, Brisbane QLD 4000'],
      schema: {
        types: ['Organization', 'WebSite', 'Store'],
        blockCount: 2,
        name: 'Demo Retail Brand',
        telephone: null,
        locality: 'Brisbane',
        region: 'QLD',
        postcode: '4000',
        streetAddress: 'Shop 12, 1 Sample Lane',
      },
      openGraph: {
        title: 'Demo Retail Brand',
        description: 'Considered homewares, lighting and decor.',
        image: 'https://demo-retail.example/og.jpg',
        siteName: 'Demo Retail Brand',
      },
      tracking: { ...NO_TRACKING, googleTagManager: true, googleAnalytics: true, googleAds: true, metaPixel: true },
      tech: [
        { name: 'Shopify', category: 'ecommerce', version: null, outdated: false },
        { name: 'Google Fonts', category: 'fonts', version: null, outdated: false },
      ],
      performance: { measured: true, ttfbMs: 210, domContentLoadedMs: 1100, loadMs: 2600, lcpMs: 1900, cls: 0.02, pageWeightKb: 1800, requestCount: 58, scriptCount: 18 },
      design: { modernImages: 30, lazyImages: 28, svgCount: 14, webFonts: ['Inter', 'Playfair Display'], usesFlexOrGrid: true, legacyTags: 0, layoutTables: 0, flash: false, horizontalOverflow: false, mediaQueries: 22, baseFontPx: 16, viewportWidth: 1366 },
      freshness: { copyrightYear: new Date().getFullYear(), modifiedMeta: null, serverLastModified: null },
      wordCount: 1420,
    }),
  },
]

export function getDemoBusiness(id: string): DemoBusiness | undefined {
  return DEMO_BUSINESSES.find((b) => b.id === id)
}
