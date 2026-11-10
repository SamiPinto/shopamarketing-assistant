# Shopa Marketing Assistant

> Turn any business website into a marketing opportunity.

An internal Chrome extension (Manifest V3) for the Shopa Marketing team. Open it on a
prospect's website and it reads the publicly visible page, runs a deterministic,
rule-based analysis and turns the signals into marketing opportunities, a potential
service fit, a draft strategy and a client opportunity report.

V1 runs **entirely locally**. There is no backend, no API key, no AI model and no
paid third-party service. The code is layered so those can be added later without
rebuilding the UI.

---

## 1. Overview

The main sales workflow takes one click:

1. Visit the prospect's website.
2. Click the **Shopa Marketing Assistant** icon in the toolbar.
3. Click **Generate Report**. The page is scanned and the **Client Report** opens
   in a new tab:
   - a branded 1–2 page *Website Opportunity Snapshot*, with an at-a-glance
     summary, what's working well and the **top 3–5 improvements** (what we found,
     why it matters, how Shopa can help)
   - a **Sales talking points** panel (on screen only, never printed) with an
     opening pitch and one line per improvement
4. Click **Print / Save PDF** to send or bring the report, or **Copy Talking
   Points** to prepare for the call.

**Quick Analysis** shows the results inside the popup instead. The **Dashboard**
has the detail modules (Website, SEO, Conversion, Social, Advertising, Local,
OOH), plus Competitors, Strategy and the internal Full Report.

The product never claims more than the page shows:

- Each finding is labelled **Detected**, **Not detected**, **Potential** or
  **Requires research**.
- A missing link means "not detected on this page", not "doesn't exist".
- Services are shown as a **potential service fit**, never as a confirmed need.
- It never invents ad spend, OOH inventory, pricing, reach or audience numbers.
- **Shopa Insight** is generated from deterministic templates, and the UI says so
  ("Rule-based analysis · no AI model used").

## 2. Features

| Area | What it does |
| --- | --- |
| Client Report | One-click branded A4 snapshot (1–2 pages). It covers the top 3–5 improvements, ranked by sales value, and fills in honest "growth ideas" when a site has few gaps. On screen it adds talking points. Print/Save PDF, Copy, Export |
| Popup | Detects the current site; Generate Report; real progress steps; summary of results; opportunities; recent analyses |
| Website intelligence (for selling websites) | **Technology** (WordPress/Wix/Shopify/Squarespace/Webflow/Next.js and more, with versions; old jQuery/Bootstrap/WordPress flagged as outdated) · **Page speed** measured in the browser (LCP, CLS, full load, page weight; optional Google PageSpeed score) · **Mobile responsive** · **Design freshness** score (heuristic) · **Last updated** (modified dates or copyright year) · **Online since** (domain registration or first archive capture) · **Domain provider** (registrar) · **Hosting provider**, plus CDN, DNS and email providers · a **Website upgrade opportunity** rating (strong / moderate / low) |
| Sales pitch | Two lines in the client report and talking points: a diagnosis from the evidence, then the Shopa offer. It leads with a website rebuild or refresh when the evidence supports one, and otherwise moves to growth services |
| Competitors | Google search and Maps links to find real competitors. Analyse their sites, then compare them side by side (technology, speed, mobile, design, last updated, hosting, SEO, conversion). Linked competitors appear in the client report as "How you compare" |
| Website | HTTPS, mobile viewport, title, meta, headings, images/alt text, forms, CTAs, contact details, social links, Open Graph, content depth |
| SEO | Title/meta length, H1, heading structure, canonical, Open Graph, alt text, internal/external links, schema.org, `lang`, plus a search-result preview. Each check has a "Why this matters" disclosure |
| Conversion | Grid of 12 conversion signals (Phone, Email, Forms, Book, Contact, Quote, Get Started, Enquire, Call Now, Shop Now, Learn More, Apply), a CTA table, and above-the-fold detection |
| Social | Instagram, Facebook, LinkedIn, TikTok, YouTube, X: detected, not detected on this page, or activity unknown |
| Advertising | Google Ads, Meta Pixel, GTM, GA, LinkedIn and TikTok tags. Explains that tags do not prove campaigns or spend |
| Local | Location (from schema, address text or a city mention), NAP details, LocalBusiness schema, AU market signal. GBP and reviews are marked as needing research |
| OOH | A module in its own right: campaign context, 8 environments (all marked "Research required"), the information still needed, and an **OOH Brief Builder** with copy and export |
| Strategy | Builds a strategy: current situation, potential opportunities, items to investigate, potential channels and a 90-day plan |
| Report | Internal opportunity report (11 sections). Copy Summary, Copy Full Report, Print (print CSS gives a clean A4 page and supports Save as PDF), and Export as Markdown |

## 3. Tech stack

- React 19, TypeScript (strict mode), Vite 8 (Rolldown)
- Chrome Extension Manifest V3: service worker plus a content script injected on demand
- `lucide-react` for icons. There are no other runtime dependencies: no UI kit and
  no state library
- Plain CSS with design tokens (CSS variables) in `src/styles/tokens.css`
- `oxlint` for linting

## 4. Installation

```bash
npm install
```

## 5. Development

```bash
npm run dev
```

This opens `http://localhost:5173/popup.html`, which shows the popup in a
420 × 600 frame. The dashboard is at `/dashboard.html`. Outside the extension,
`chrome.*` APIs are not available, so:

- storage falls back to `localStorage`
- live tab analysis is turned off, so only the layout can be checked here.

Use this for fast UI work with hot reload. To test **real page analysis**, build
the extension and load it in Chrome (below).

Other scripts:

| Command | Purpose |
| --- | --- |
| `npm run build` | Typecheck, then build the extension into `dist/` |
| `npm run watch` | Build once, then rebuild pages, the service worker and the content script on every change |
| `npm run preview` | Serve the built `dist/` in a normal tab |
| `npm run typecheck` | `tsc -b` only |
| `npm run lint` | oxlint |
| `npm run icons` | Regenerate the PNG icons (Shopa purple gradient) from `scripts/generate-icons.mjs`. The same mark is in `public/icons/icon.svg` |

## 6. Production build

```bash
npm run build
```

`dist/` then contains everything Chrome needs:

```
dist/
├── manifest.json
├── popup.html
├── dashboard.html
├── background.js      # MV3 service worker (ES module)
├── content.js         # single-file IIFE, injected on demand
├── icons/icon16|32|48|128.png
└── assets/            # hashed JS/CSS chunks
```

The build runs twice. `vite.config.ts` builds the pages and the service worker.
`vite.content.config.ts` builds the content script as one self-contained IIFE,
because scripts injected with `chrome.scripting` cannot use ES module imports.

## 7. Chrome extension installation

1. `npm install`
2. `npm run build`
3. Open Chrome and go to `chrome://extensions/`
4. Turn on **Developer mode** (top right)
5. Click **Load unpacked**
6. Select the project's **`dist/`** folder
7. Pin **Shopa Marketing Assistant** (puzzle-piece icon → pin)
8. Visit a normal public website, for example a local business homepage
9. Open the extension from the toolbar
10. Click **Analyse Website**

### Rolling out to the sales team

Choose one of these:

| Option | How | Best for |
| --- | --- | --- |
| **Share the build** | Zip the `dist/` folder. Each person unzips it and uses *Load unpacked*, as in steps 3–7 above | Quick pilot with 2–5 people |
| **Chrome Web Store (Unlisted or Private)** | Register a Chrome Web Store developer account (one-off fee) → upload a zip of `dist/` → set visibility to *Unlisted*, or *Private* for your Google Workspace domain | Real rollout with automatic updates |
| **Google Workspace force-install** | Publish privately, then in Google Admin go to *Devices → Chrome → Apps & extensions* and force-install it for the sales team | Managed company devices |

Before publishing, raise `version` in `public/manifest.json` for every update.

Each salesperson should fill in **Prepared by** and **Contact** once on the Client
Report page. These are saved locally and printed on every report.

### Feature switches

`src/config/features.ts` turns modules on and off without deleting code. **OOH**
and **Competitors** are currently hidden (`ooh: false`, `competitors: false`).
Hiding them removes their dashboard pages, their opportunities and service
suggestions, their sections in the reports and the client report, and the
outdoor-advertising question. To bring them back, set the flag to `true`, run
`npm run build` and reload the extension.

### DataForSEO (keyword rankings and search volumes)

SEO › Keyword rankings uses DataForSEO when a login is set, otherwise the free
Google-tab method.

1. Copy `.env.example` to `.env` (already done once; `.env` is git-ignored).
2. Fill in `VITE_DATAFORSEO_LOGIN` and `VITE_DATAFORSEO_PASSWORD` from
   <https://app.dataforseo.com/api-access>. The API password is not the website password.
3. `npm run build` (or restart `npm run watch`) and reload the extension.

Each search costs about US$0.002 per Google results page, plus about US$0.075 per
run for search volumes; the dashboard shows the estimate and the balance. The login
is built into the extension files, so only share the built extension inside the team.

## 8. Reloading after code changes

Chrome extensions do not hot-reload the way a normal Vite site does.

- **Easiest:** keep `npm run watch` running. After each rebuild the extension
  reloads itself and reopens any dashboard tabs (see `src/utils/devReload.ts`;
  `npm run build` leaves this out). Load `dist/` unpacked once; no manual reload needed.
- **Without watch:** run `npm run build`, then click the **reload ↻** icon on the
  extension card in `chrome://extensions/`.
- **Content script changes:** after reloading the extension, also **reload the web
  page** you are testing. A page that already has the old script injected keeps it
  until it reloads.
- **Open dashboard tabs:** reload them after an extension reload. A stale tab shows
  a "This section couldn't be loaded" message with a reload button.
- **Popup DevTools:** right-click inside the open popup → **Inspect**.
- **Service worker DevTools:** `chrome://extensions/` → the extension card →
  **Inspect views: service worker**.
- **Content script logs:** open the page's own DevTools and pick the extension's
  context in the console context dropdown.

## 9. Architecture

```
src/
├── background/background.ts      MV3 service worker: install defaults, open/focus dashboard
├── content/contentScript.ts      Read-only DOM extraction → PageExtraction
├── popup/                        Popup entry, header and views (home, results, opportunities)
├── dashboard/                    Dashboard entry and shell (sidebar, topbar, lazy modules)
├── pages/dashboardRoutes.ts      Route registry with React.lazy modules
├── components/
│   ├── ui/                       Button, StatusBadge, CheckList, Modal, ScanProgress, …
│   ├── layout/                   Sidebar, Topbar, ModuleErrorBoundary
│   ├── overview/                 Category list, opportunities, Shopa Insight, service fit
│   ├── website/ seo/ conversion/ social/ advertising/ local/
│   ├── ooh/                      OOH module, brief builder, brief document
│   ├── competitors/ strategy/ reports/
├── hooks/                        AnalysisContext (state + chrome.storage sync), clipboard, hash routing
├── services/
│   ├── tabService.ts             Active tab detection, eligibility, on-demand injection
│   ├── analysisService.ts        PageExtraction → MarketingAnalysis (pipeline)
│   ├── analysis/                 scoring, business detection, category rules, opportunities, service fit
│   ├── seoService.ts  oohService.ts
│   ├── reportService.ts  strategyService.ts  aiService.ts
│   └── storageService.ts         Persistence abstraction
├── types/                        Strong contracts: page, analysis, ooh, misc
├── data/                         Industries, OOH environments
├── utils/                        Signal patterns, formatting, chrome helpers
└── styles/                       tokens, base, components, popup, dashboard, print
```

Each layer only talks to the one below it:

```
components → hooks (AnalysisContext) → services → data / chrome APIs
```

Components never call `chrome.*` or touch fixtures directly. Every service exposes a
**provider interface**, and the local provider is the default:

| Service | Interface | V1 provider |
| --- | --- | --- |
| `analysisService` | `AnalysisProvider` | local deterministic engine |
| `seoService` | `SeoProvider` | on-page checks |
| `oohService` | `OOHDataProvider` | static environment reference (no inventory) |
| `aiService` | `InsightProvider` | template insight (`provider: 'template'`) |
| `storageService` | `KeyValueStore` | `chrome.storage.local` / `localStorage` |

### Scoring rules

Scores are rule-based. Nothing is random, and the UI always shows a score
together with the checks that produced it ("7 of 9 weighted checks good").

- Every check has a **weight**. A weight of 0 means the check is informational only.
- `good` earns full weight, `attention` earns half, `not-detected` earns 0.
  `unknown` checks are **left out**, because we can't score what we can't see.
- `score = earned ÷ possible × 100`.
- Category status: Website, Conversion and Local are **Good** at 75 or above.
  SEO is Good at 80 or above. Everything below that is **Attention**.
- Social and Advertising have **no score**. Their status is **Detected** or
  **Limited signals**.
- OOH is always **Research needed**.

| Category | Checks (weight) |
| --- | --- |
| Website | HTTPS (3), mobile viewport (3), title (2), headings (2), primary CTA (2), contact info (2), meta description (1), images/alt (1), forms (1), social links (1), Open Graph (1), content ≥ 300 words (1) |
| SEO | title 15–65 chars (3), meta 50–165 chars (3), exactly one H1 (3), canonical (2), alt text (2; more than 50% missing = not detected), schema.org (2), ≥ 2 H2s (1), Open Graph complete (1), ≥ 10 internal links (1), `lang` (1). Informational: external links, robots/sitemap (needs a server-side request) |
| Conversion | primary CTA (3; only soft "Learn more" CTAs = attention), primary CTA above the fold (2), phone (2), lead form that isn't only a search box (2), email (1), book/quote/enquire/shop action (1) |
| Local | location (3), street address (2), phone (2), LocalBusiness-type schema (2), .au domain or en-AU (1). Unknown: Google Business Profile, reviews |

**Opportunities** come from failing checks through a rules table
(`services/analysis/opportunities.ts`), plus social, advertising and OOH rules. The
"opportunity signals detected" count leaves out research-only items.
**Service fit** rules (`services/analysis/serviceFit.ts`) only show a service when
specific signals support it. For example, OOH needs both a detected location and an
industry that usually has a physical presence.

## 10. Permissions

| Permission | Why |
| --- | --- |
| `activeTab` | Gives temporary access to the current tab only after the user opens the extension, so the scanner can be injected without broad host permissions |
| `scripting` | Injects `content.js` on demand when the user clicks Analyse |
| `tabs` | Reads the active tab's URL and title to show "Current website" and to block internal pages |
| `storage` | Saves recent analyses, settings, the last analysis and OOH brief drafts locally |
| `host_permissions: https://web.archive.org/*` | Its history API doesn't send CORS headers. This is the only site-specific permission, and it's used only for "Online since" |

There is no `content_scripts` entry that runs on every page.

**Online lookups:** these are free services with no API key, and they can be switched
off in Settings. They are called from the dashboard, and only the website's domain
name, its IP and its URL are sent:

| Data | Source |
| --- | --- |
| Domain provider, registration/expiry dates | RDAP, found through IANA's official bootstrap file (fallback: rdap.org) |
| Hosting / CDN provider | Google DNS-over-HTTPS (A record) → RDAP IP owner (ARIN, which redirects to APNIC etc.) |
| DNS and email provider | Google DNS-over-HTTPS (NS and MX records) |
| Online since | Internet Archive CDX (first capture) |
| Google PageSpeed score (optional) | PageSpeed Insights API. Needs a free API key in Settings, because Google's shared keyless quota is usually exhausted |

Results are cached for 7 days, or 1 hour if a source was down. `.au` registries
don't publish registration dates, so "Online since" falls back to the first archive
capture. When a site sits behind Cloudflare or another CDN, the report says
"Behind Cloudflare" instead of guessing the hidden host. The scanner only runs when the user asks for it. Chrome internal pages
(`chrome://`, `chrome-extension://`, `edge://`, `about:`, …), the Chrome Web Store,
`file://` URLs and the PDF viewer are detected and show "This page can't be analysed."

> **Popup size:** Chrome caps extension popups at **800 × 600 px**, so the popup is
> 420 × 600 (the brief asked for 650–750 px, which Chrome does not allow). Its body
> scrolls internally, and longer work happens in the full-page dashboard.

## 11. Future backend architecture

```
React (popup / dashboard)
   ↓  services/* provider interfaces (unchanged UI)
FastAPI
   ↓
Supabase / PostgreSQL   (analyses, teams, briefs, report history)
   ↓
External APIs           (crawl, SEO, ads libraries, GBP, OOH data)
   ↓
LLM provider            (Shopa Insight, strategy narrative)
```

To migrate, add a remote provider for each service, for example
`analysisService.provider = remoteAnalysisProvider`, and a `KeyValueStore` that
calls the API. `PageExtraction` and `MarketingAnalysis` are the stable contracts.
The `scoringVersion` field already marks which rules produced each stored analysis.

## 12. Future API integrations

- **Crawling / SEO:** a full-site crawl, robots.txt and sitemap, rankings, backlinks, Core Web Vitals (PageSpeed Insights)
- **Local:** Google Business Profile, reviews, map-pack visibility
- **Advertising:** Google Ads Transparency Centre, Meta Ad Library, client account access
- **Social:** follower counts, posting cadence and engagement through platform APIs
- **OOH:** media owner inventory, availability, pricing and audience measurement
- **Competitors:** competitor discovery and comparison through SEO and ad-intelligence providers
- **AI:** an LLM-backed `InsightProvider` that runs **server-side**
- **Exports:** server-side PDF/DOCX, and CRM hand-off

## 13. Security considerations

- **No secrets in the extension.** Anything bundled, including `.env` values that Vite
  inlines, can be read by anyone who has the extension. API keys must stay on the
  backend, and the extension should authenticate to that backend.
- The content script is **read-only**. It reads rendered DOM, meta tags, JSON-LD and
  script `src` URLs. It makes no network requests, never touches forms, cookies or
  storage, and never fetches pages behind a login.
- It does not bypass logins, CAPTCHAs, robots rules or paywalls, and it only reads
  what the current tab already shows.
- Only business contact details **published on the page** are collected (phone,
  email, address), capped at 5 each. They stay in local storage.
- The extension never sends email, WhatsApp or any other message. It is a research
  assistant only.
- Extension pages use a strict CSP (`script-src 'self'`) and load no remote code.
