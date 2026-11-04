import { OOH_ENVIRONMENTS, OOH_REQUIRED_INFORMATION } from '../data/oohEnvironments'
import type { BusinessProfile, CategoryResult, MarketingAnalysis } from '../types/analysis'
import type { OOHBrief, OOHBriefInput, OOHEnvironment, OOHEnvironmentId } from '../types/ooh'
import { formatDate } from '../utils/format'
import { hasPhysicalFootprint } from './analysis/business'
import { makeCheck } from './analysis/scoring'

/**
 * OOH is evaluated as its own discipline, not an upsell. From a website alone we
 * can only establish context (location, footprint); suitability always needs
 * campaign, audience and inventory data. A future provider can plug in real
 * inventory and audience data via this interface.
 */
export interface OOHDataProvider {
  getEnvironments(): Promise<OOHEnvironment[]>
}

const localProvider: OOHDataProvider = {
  async getEnvironments() {
    return OOH_ENVIRONMENTS
  },
}

const WHY_RESEARCH = 'OOH suitability depends on campaign objectives, audience and available media — none of which can be read from a website.'

export function analyseOOH(business: BusinessProfile): CategoryResult {
  const footprint = hasPhysicalFootprint(business)
  const checks = [
    makeCheck('ooh-location', 'Business location', business.location ? 'good' : 'not-detected',
      business.location ? business.location.label : 'No location detected on this page.',
      'OOH is inherently geographic — planning starts from where the audience lives, works and travels.', 0),
    makeCheck('ooh-footprint', 'Physical presence', footprint ? 'good' : 'unknown',
      footprint ? `${business.industry?.label} businesses typically serve customers at a physical location.` : 'Requires further research.',
      'Destination businesses can use proximity-based OOH to drive visits.', 0),
    makeCheck('ooh-audience', 'Target audience', 'unknown', 'Requires client input.', WHY_RESEARCH, 0),
    makeCheck('ooh-objective', 'Campaign objective', 'unknown', 'Requires client input.', WHY_RESEARCH, 0),
    makeCheck('ooh-budget', 'Budget & duration', 'unknown', 'Requires client input.', WHY_RESEARCH, 0),
    makeCheck('ooh-inventory', 'Available inventory', 'unknown', 'Requires media owner or OOH data provider.',
      'Availability, pricing and audience figures are not estimated by this tool.', 0),
  ]
  return {
    id: 'ooh',
    label: 'OOH',
    status: 'research',
    score: null,
    summary: 'OOH suitability requires campaign location, audience and media inventory data.',
    checks,
  }
}

export function defaultBriefInput(analysis: MarketingAnalysis | null): OOHBriefInput {
  return {
    clientName: analysis?.business.name ?? '',
    objective: '',
    location: analysis?.business.location?.label ?? '',
    audience: '',
    budget: '',
    duration: '',
    environments: [],
    message: '',
    cta: '',
  }
}

const OUTSTANDING_LABELS: [keyof OOHBriefInput, string][] = [
  ['objective', 'Campaign objective'],
  ['location', 'Campaign location'],
  ['audience', 'Target audience'],
  ['budget', 'Budget'],
  ['duration', 'Campaign duration'],
  ['message', 'Campaign message'],
]

export function buildBrief(input: OOHBriefInput): OOHBrief {
  const envLabels = input.environments
    .map((id) => OOH_ENVIRONMENTS.find((e) => e.id === id)?.label)
    .filter((l): l is string => Boolean(l))
  const value = (v: string) => v.trim() || 'To be confirmed'

  const outstanding = OUTSTANDING_LABELS.filter(([key]) => !String(input[key]).trim()).map(([, label]) => label)
  if (envLabels.length === 0) outstanding.push('Preferred environments')
  outstanding.push('Available inventory (from media owners)', 'Audience data (from media owners or measurement provider)')

  return {
    createdAt: new Date().toISOString(),
    input,
    outstanding,
    sections: [
      { heading: 'Client', lines: [value(input.clientName)] },
      { heading: 'Objective', lines: [value(input.objective)] },
      { heading: 'Location', lines: [value(input.location)] },
      { heading: 'Audience', lines: [value(input.audience)] },
      { heading: 'Budget', lines: [value(input.budget)] },
      { heading: 'Campaign duration', lines: [value(input.duration)] },
      { heading: 'Preferred environments', lines: envLabels.length ? envLabels : ['To be confirmed'] },
      { heading: 'Campaign message', lines: [value(input.message)] },
      { heading: 'Call to action', lines: [value(input.cta)] },
      { heading: 'Measurement', lines: ['Reach', 'Impressions', 'Frequency', 'Location exposure'] },
    ],
  }
}

export function briefToText(brief: OOHBrief): string {
  const lines = [
    'SHOPA MARKETING — OOH CAMPAIGN BRIEF',
    `Prepared ${formatDate(brief.createdAt)}`,
    '',
    ...brief.sections.flatMap((s) => [s.heading.toUpperCase(), ...s.lines, '']),
    'OUTSTANDING INFORMATION',
    ...brief.outstanding.map((o) => `- ${o}`),
    '',
    'Note: This brief contains no inventory availability, pricing or audience figures. These must be sourced from media owners.',
  ]
  return lines.join('\n')
}

export const oohService = {
  provider: localProvider,
  requiredInformation: OOH_REQUIRED_INFORMATION,
  getEnvironments(): Promise<OOHEnvironment[]> {
    return this.provider.getEnvironments()
  },
  /** Environments worth discussing first, based only on detected context. */
  suggestEnvironments(business: BusinessProfile | null): OOHEnvironmentId[] {
    if (!business?.location) return []
    if (business.industry?.id === 'retail') return ['shopping-centres', 'retail', 'digital-billboards']
    if (business.industry?.id === 'finance' || business.industry?.id === 'legal') return ['office', 'airport']
    if (hasPhysicalFootprint(business)) return ['street-furniture', 'roadside', 'digital-billboards']
    return []
  },
  analyse: analyseOOH,
  buildBrief,
  briefToText,
}
