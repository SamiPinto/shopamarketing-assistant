import type { CategoryId, MarketingAnalysis } from '../types/analysis'
import type { OpportunityReport, ReportSection } from '../types/misc'
import { formatDate, lowerFirst, slugify } from '../utils/format'
import { countSignals } from './analysis/opportunities'
import { OOH_REQUIRED_INFORMATION } from '../data/oohEnvironments'
import { FEATURES } from '../config/features'

const STATUS_WORD: Record<string, string> = {
  good: '✓',
  attention: '⚠',
  'not-detected': '✕',
  unknown: '?',
}

function findings(analysis: MarketingAnalysis, id: CategoryId): ReportSection {
  const category = analysis.categories[id]
  return {
    id,
    title: `${category.label} findings`,
    paragraphs: [category.summary],
    bullets: category.checks.map((c) => `${STATUS_WORD[c.status]} ${c.label}: ${c.detail}`),
  }
}

/**
 * Builds the internal opportunity report. Wording stays factual: findings are
 * "detected"/"not detected", services are "potential fit" — no promises.
 */
export function buildReport(analysis: MarketingAnalysis, preparedBy: string | null): OpportunityReport {
  const { business, insight, services } = analysis
  const signals = countSignals(analysis.opportunities)

  const sections: ReportSection[] = [
    {
      id: 'summary',
      title: 'Executive summary',
      paragraphs: [
        ...insight.summary,
        `Business: ${business.name}${business.industry ? ` · Industry: ${business.industry.label} (${lowerFirst(business.industry.basis)})` : ''}${business.location ? ` · Location: ${business.location.label}` : ''}.`,
      ],
      bullets: analysis.opportunities
        .filter((o) => o.certainty !== 'research')
        .slice(0, 5)
        .map((o) => `${o.title} — ${o.detail}`),
    },
    findings(analysis, 'website'),
    findings(analysis, 'seo'),
    findings(analysis, 'conversion'),
    findings(analysis, 'social'),
    findings(analysis, 'advertising'),
    findings(analysis, 'local'),
    ...(FEATURES.ooh ? [{
      id: 'ooh',
      title: 'OOH considerations',
      paragraphs: [
        analysis.categories.ooh.summary,
        'No OOH inventory, pricing or audience figures are included. These require media owner or OOH data provider input.',
      ],
      bullets: OOH_REQUIRED_INFORMATION.map((i) => `Required: ${i}`),
    }] : []),
    {
      id: 'services',
      title: 'Potential Shopa services',
      paragraphs: [
        services.length
          ? 'The following services show a potential fit based on detected signals. These are not confirmed needs.'
          : 'No service showed a clear potential fit from the signals on this page.',
      ],
      bullets: services.map((s) => `${s.label} (${s.strength === 'strong-signal' ? 'strong signal' : 'worth exploring'}) — ${s.reason}`),
    },
    {
      id: 'next-steps',
      title: 'Recommended next steps',
      bullets: [
        ...insight.investigate,
        'Validate findings across the wider site and with client data before making recommendations.',
      ],
    },
    {
      id: 'missing',
      title: 'Information required for deeper analysis',
      bullets: insight.missingInformation,
    },
  ]

  return {
    title: 'Marketing Opportunity Report',
    business: business.name,
    website: business.url,
    analysisDate: formatDate(analysis.analysedAt),
    preparedBy: preparedBy?.trim() || null,
    sections: sections.map((s) => (s.id === 'summary' ? { ...s, title: `Executive summary — ${signals} opportunity signals` } : s)),
  }
}

export function reportToText(report: OpportunityReport): string {
  const header = [
    'SHOPA MARKETING',
    report.title,
    '',
    `Business: ${report.business}`,
    `Website: ${report.website}`,
    `Analysis date: ${report.analysisDate}`,
    ...(report.preparedBy ? [`Prepared by: ${report.preparedBy}`] : []),
    'Internal research document — findings are based on publicly visible page signals.',
  ]

  const body = report.sections.flatMap((s) => [
    '',
    s.title.toUpperCase(),
    ...(s.paragraphs ?? []),
    ...(s.bullets ?? []).map((b) => `- ${b}`),
  ])
  return [...header, ...body].join('\n')
}

export function reportToMarkdown(report: OpportunityReport): string {
  const lines = [
    `# Shopa Marketing — ${report.title}`,
    `**Business:** ${report.business}  `,
    `**Website:** ${report.website}  `,
    `**Analysis date:** ${report.analysisDate}  `,
    report.preparedBy ? `**Prepared by:** ${report.preparedBy}  ` : '',
    '',
    '_Internal research document — findings are based on publicly visible page signals._',
  ]
  for (const s of report.sections) {
    lines.push('', `## ${s.title}`, '')
    for (const p of s.paragraphs ?? []) lines.push(p, '')
    for (const b of s.bullets ?? []) lines.push(`- ${b}`)
  }
  return lines.filter((l, i, arr) => !(l === '' && arr[i - 1] === '')).join('\n')
}

export function summaryToText(analysis: MarketingAnalysis): string {
  const { business, insight, services } = analysis
  return [
    `${business.name} — ${business.domain}`,
    insight.headline,
    '',
    ...insight.summary,
    '',
    'Top opportunities:',
    ...analysis.opportunities.filter((o) => o.certainty !== 'research').slice(0, 5).map((o) => `- ${o.title}`),
    '',
    `Potential service fit: ${services.map((s) => s.label).join(', ') || 'None identified'}`,
  ].join('\n')
}

export function downloadTextFile(filename: string, content: string, type = 'text/markdown'): void {
  const blob = new Blob([content], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  // Revoke on the next tick so the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

export function reportFilename(report: OpportunityReport, ext: string): string {
  const slug = slugify(report.business)
  return `shopa-opportunity-report-${slug || 'business'}.${ext}`
}

export const reportService = {
  build: buildReport,
  toText: reportToText,
  toMarkdown: reportToMarkdown,
  summary: summaryToText,
  download: downloadTextFile,
  filename: reportFilename,
}
