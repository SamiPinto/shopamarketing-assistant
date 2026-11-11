import type { CategoryId, MarketingAnalysis } from '../types/analysis'
import type { OpportunityReport, ReportItem, ReportSection } from '../types/misc'
import { formatDate, lowerFirst, slugify } from '../utils/format'
import { countSignals } from './analysis/opportunities'

const STATUS_WORD: Record<string, string> = {
  good: '✓',
  attention: '⚠',
  'not-detected': '✕',
  unknown: '?',
}

const isNegative = (status: ReportItem['status']) => status === 'attention' || status === 'not-detected'

/** A category's checks; `negativesOnly` keeps just the problems found. */
function findings(analysis: MarketingAnalysis, id: CategoryId, negativesOnly = false): ReportSection {
  const category = analysis.categories[id]
  const checks = negativesOnly ? category.checks.filter((c) => isNegative(c.status)) : category.checks
  // The report leaves out the "Website upgrade opportunity: … (…)." sentence, also in saved analyses.
  const summary = category.summary.replace(/\s*Website upgrade opportunity: [^(]*\([^)]*\)\./, '').trim()
  return {
    id,
    title: negativesOnly ? `${category.label}: what needs fixing` : `${category.label} findings`,
    paragraphs: summary ? [summary] : [],
    items: checks.map((c) => ({ status: c.status, label: c.label, detail: c.detail })),
  }
}

/**
 * Builds the internal opportunity report. Wording stays factual: findings are
 * "detected"/"not detected" — no promises.
 */
export function buildReport(analysis: MarketingAnalysis): OpportunityReport {
  const { business, insight } = analysis
  const signals = countSignals(analysis.opportunities)

  const sections: ReportSection[] = [
    {
      id: 'summary',
      title: `Executive summary — ${signals} opportunity signals`,
      paragraphs: [
        // Analyses saved before the wording changed still say "marketing opportunity signals".
        ...insight.summary.map((p) => p.replace(/ marketing opportunity signal/g, ' opportunity signal')),
        `Business: ${business.name}${business.industry ? ` · Industry: ${business.industry.label} (${lowerFirst(business.industry.basis)})` : ''}${business.location ? ` · Location: ${business.location.label}` : ''}.`,
      ],
      items: analysis.opportunities
        .filter((o) => o.certainty !== 'research')
        .slice(0, 5)
        .map((o) => ({ label: o.title, detail: o.detail })),
    },
    findings(analysis, 'website'),
    findings(analysis, 'seo', true),
  ]

  return {
    title: 'Marketing Opportunity Report',
    business: business.name,
    website: business.url,
    analysisDate: formatDate(analysis.analysedAt),
    sections,
  }
}

function itemText(item: ReportItem): string {
  return `${item.status ? `${STATUS_WORD[item.status]} ` : ''}${item.label}: ${item.detail}`
}

export function reportToText(report: OpportunityReport): string {
  const header = [
    'SHOPA MARKETING',
    report.title,
    '',
    `Business: ${report.business}`,
    `Website: ${report.website}`,
    `Analysis date: ${report.analysisDate}`,
    'Internal research document — findings are based on publicly visible page signals.',
  ]

  const body = report.sections.flatMap((s) => [
    '',
    s.title.toUpperCase(),
    ...(s.paragraphs ?? []),
    ...(s.items ?? []).map((i) => `- ${itemText(i)}`),
  ])
  return [...header, ...body].join('\n')
}

export function reportToMarkdown(report: OpportunityReport): string {
  const lines = [
    `# Shopa Marketing — ${report.title}`,
    `**Business:** ${report.business}  `,
    `**Website:** ${report.website}  `,
    `**Analysis date:** ${report.analysisDate}  `,
    '',
    '_Internal research document — findings are based on publicly visible page signals._',
  ]
  for (const s of report.sections) {
    lines.push('', `## ${s.title}`, '')
    for (const p of s.paragraphs ?? []) lines.push(p, '')
    for (const i of s.items ?? []) lines.push(`- ${i.status ? `${STATUS_WORD[i.status]} ` : ''}**${i.label}:** ${i.detail}`)
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
