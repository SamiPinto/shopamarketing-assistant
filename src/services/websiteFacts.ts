import type { MarketingAnalysis } from '../types/analysis'
import type { WebsiteIntel } from '../types/intel'

export type FactTone = 'good' | 'attention' | 'neutral' | 'pending'

export interface WebsiteFact {
  id: 'platform' | 'online' | 'updated' | 'speed' | 'mobile' | 'ai' | 'design' | 'domain' | 'hosting'
  label: string
  value: string
  detail: string | null
  tone: FactTone
}

// Display order. The first row (four per row) is what salespeople check first.
const ORDER: WebsiteFact['id'][] = ['speed', 'mobile', 'ai', 'platform', 'online', 'updated', 'design', 'domain', 'hosting']

const monthYear = (iso: string) => new Date(iso).toLocaleDateString('en-AU', { month: 'short', year: 'numeric' })

function yearsSince(iso: string): number {
  return Math.floor((Date.now() - Date.parse(iso)) / (365.25 * 86_400_000))
}

/**
 * The website facts a salesperson needs, combining page signals with optional
 * online intel. `intelLoading` shows "Checking…" instead of "Unavailable".
 */
export function buildWebsiteFacts(a: MarketingAnalysis, intel: WebsiteIntel | null, intelLoading = false): WebsiteFact[] {
  const w = a.website
  const pending = (label: string, id: WebsiteFact['id']): WebsiteFact => ({ id, label, value: 'Checking…', detail: null, tone: 'pending' })
  const others = w.techStack.filter((t) => !w.platform?.includes(t.name) && t.category !== 'fonts').map((t) => (t.version ? `${t.name} ${t.version}` : t.name))

  const facts: WebsiteFact[] = [
    {
      id: 'platform',
      label: 'Technology',
      value: w.platform ?? (w.techStack[0]?.name ? w.techStack.map((t) => t.name).slice(0, 2).join(', ') : 'Not identified'),
      detail: w.outdatedTech.length ? `Outdated: ${w.outdatedTech.join(', ')}` : others.length ? others.slice(0, 4).join(', ') : null,
      tone: w.outdatedTech.length ? 'attention' : 'neutral',
    },
  ]

  // Online since: domain registration date, else first web-archive capture.
  if (intel?.domainInfo.registeredOn) {
    facts.push({ id: 'online', label: 'Online since', value: monthYear(intel.domainInfo.registeredOn), detail: `Domain registered ~${yearsSince(intel.domainInfo.registeredOn)} years ago`, tone: 'neutral' })
  } else if (intel?.archive.firstSeen) {
    facts.push({ id: 'online', label: 'Online since', value: monthYear(intel.archive.firstSeen), detail: 'First captured by the Internet Archive', tone: 'neutral' })
  } else if (intelLoading) {
    facts.push(pending('Online since', 'online'))
  } else {
    facts.push({ id: 'online', label: 'Online since', value: 'Unavailable', detail: intel ? 'No registration date or archive record found' : 'Online lookups are off', tone: 'neutral' })
  }

  facts.push({
    id: 'updated',
    label: 'Last updated',
    value: w.lastUpdated.year ? String(w.lastUpdated.year) : 'Unknown',
    detail: w.lastUpdated.year ? `${w.lastUpdated.stale ? 'No newer date found' : 'Recent'} — from ${w.lastUpdated.basis}` : 'No update date found on the page',
    tone: w.lastUpdated.stale ? 'attention' : w.lastUpdated.year ? 'good' : 'neutral',
  })

  const psi = intel?.pageSpeed?.status === 'ok' ? intel.pageSpeed : null
  facts.push({
    id: 'speed',
    label: 'Page speed',
    value: psi?.performanceScore !== null && psi?.performanceScore !== undefined ? `${psi.performanceScore}/100 (Google mobile)` : w.speed.rating === 'unknown' ? 'Not measured' : w.speed.label.split(' — ')[0],
    detail: [
      w.speed.lcpMs !== null && `Main content ${(w.speed.lcpMs / 1000).toFixed(1)}s`,
      w.speed.loadMs !== null && `full load ${(w.speed.loadMs / 1000).toFixed(1)}s`,
      w.speed.pageWeightKb !== null && `${(w.speed.pageWeightKb / 1024).toFixed(1)} MB+`,
    ]
      .filter(Boolean)
      .join(' · ') || null,
    tone: psi ? (psi.performanceScore! >= 90 ? 'good' : 'attention') : w.speed.rating === 'good' ? 'good' : w.speed.rating === 'unknown' ? 'neutral' : 'attention',
  })

  facts.push({
    id: 'mobile',
    label: 'Mobile responsive',
    value: w.responsive.label,
    detail: w.responsive.reasons[0] ?? null,
    tone: w.responsive.rating === 'good' ? 'good' : 'attention',
  })

  const ai = w.aiFriendly
  facts.push(
    ai
      ? {
          id: 'ai',
          label: 'AI friendly',
          value: { good: 'Yes', fair: 'Partly', poor: 'No', unknown: 'Unknown' }[ai.rating],
          detail: (ai.rating === 'good' ? ai.present.slice(0, 2).join(', ') : ai.missing.slice(0, 2).join('; ')) || null,
          tone: ai.rating === 'good' ? 'good' : 'attention',
        }
      : { id: 'ai', label: 'AI friendly', value: 'Not checked', detail: 'Analyse this website again to check', tone: 'neutral' },
  )

  facts.push({
    id: 'design',
    label: 'Design (UI/UX)',
    value: { modern: 'Modern', dated: 'Dated', outdated: 'Outdated' }[w.design.rating],
    // Outdated tech already appears on the Technology fact; don't repeat it here.
    detail:
      (w.design.rating === 'modern' ? w.design.modernSignals : w.design.datedSignals.filter((s) => !s.startsWith('Outdated technology')))
        .slice(0, 2)
        .join('; ') || null,
    tone: w.design.rating === 'modern' ? 'good' : 'attention',
  })

  if (intel?.domainInfo.registrar) {
    facts.push({
      id: 'domain',
      label: 'Domain provider',
      value: intel.domainInfo.registrar,
      detail: intel.domainInfo.expiresOn ? `Renews ${monthYear(intel.domainInfo.expiresOn)}` : intel.domainInfo.registrableDomain,
      tone: 'neutral',
    })
  } else {
    facts.push(intelLoading ? pending('Domain provider', 'domain') : { id: 'domain', label: 'Domain provider', value: 'Unavailable', detail: null, tone: 'neutral' })
  }

  const h = intel?.hosting
  if (h && (h.hostingProvider || h.cdn || h.ipOwner)) {
    facts.push({
      id: 'hosting',
      label: 'Hosting provider',
      value: h.hostingProvider ?? (h.cdn ? `Behind ${h.cdn}` : (h.ipOwner ?? 'Unknown')),
      detail: [h.cdn && !h.hostingProvider && 'origin host hidden by CDN', h.dnsProvider && `DNS: ${h.dnsProvider}`, h.emailProvider && `Email: ${h.emailProvider}`].filter(Boolean).join(' · ') || null,
      tone: 'neutral',
    })
  } else {
    facts.push(intelLoading ? pending('Hosting provider', 'hosting') : { id: 'hosting', label: 'Hosting provider', value: 'Unavailable', detail: h?.dnsProvider ? `DNS: ${h.dnsProvider}` : null, tone: 'neutral' })
  }

  return facts.sort((x, y) => ORDER.indexOf(x.id) - ORDER.indexOf(y.id))
}
