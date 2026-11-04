import { useMemo } from 'react'
import { ClipboardCopy, Copy, Download, MessageSquareQuote, Printer } from 'lucide-react'
import { useAnalysis } from '../../hooks/analysisContextValue'
import { useClipboard } from '../../hooks/useClipboard'
import { useCompetitorLinks } from '../../hooks/useCompetitorLinks'
import { useWebsiteIntel } from '../../hooks/useWebsiteIntel'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { buildClientReport, clientReportToText, talkingPointsToText } from '../../services/clientReportService'
import { downloadTextFile } from '../../services/reportService'
import { slugify } from '../../utils/format'
import { Button } from '../ui/Button'
import { ClientReportDocument } from './ClientReportDocument'

export default function ClientReportModule({ analysis }: ModuleProps) {
  const { settings, updateSettings } = useAnalysis()
  const { copy, copied, failed } = useClipboard()
  const { intel, loading } = useWebsiteIntel(analysis)
  const { linked } = useCompetitorLinks(analysis)
  const report = useMemo(
    () =>
      buildClientReport(
        analysis,
        { preparedBy: settings.preparedBy, contactLine: settings.contactLine },
        { intel, intelLoading: loading, competitors: linked },
      ),
    [analysis, settings.preparedBy, settings.contactLine, intel, loading, linked],
  )
  const talkingPoints = talkingPointsToText(report)

  return (
    <div className="module client-module">
      <div className="report-toolbar no-print">
        <div className="report-toolbar__fields">
          <label className="field field--inline">
            <span className="field__label">Prepared by</span>
            <input
              type="text"
              value={settings.preparedBy}
              placeholder="Your name"
              onChange={(e) => void updateSettings({ preparedBy: e.target.value })}
            />
          </label>
          <label className="field field--inline">
            <span className="field__label">Contact</span>
            <input
              type="text"
              value={settings.contactLine}
              placeholder="email · phone"
              onChange={(e) => void updateSettings({ contactLine: e.target.value })}
            />
          </label>
        </div>
        <div className="button-row">
          <Button size="sm" icon={ClipboardCopy} onClick={() => void copy('report', clientReportToText(report))}>
            {copied === 'report' ? 'Copied' : 'Copy Report'}
          </Button>
          <Button
            size="sm"
            icon={Download}
            onClick={() =>
              downloadTextFile(`shopa-snapshot-${slugify(report.business) || 'business'}.txt`, clientReportToText(report), 'text/plain')
            }
          >
            Export
          </Button>
          <Button size="sm" variant="primary" icon={Printer} disabled={loading} onClick={() => window.print()}>
            {loading ? 'Checking domain & hosting…' : 'Print / Save PDF'}
          </Button>
        </div>
      </div>
      {failed && (
        <p className="form-error no-print" role="alert">
          Clipboard access was blocked by the browser. Use Export instead.
        </p>
      )}

      <div className="client-layout">
        <ClientReportDocument report={report} />

        <aside className="talking no-print" aria-labelledby="talking-title">
          <div className="talking__head">
            <h2 id="talking-title">
              <MessageSquareQuote size={16} aria-hidden="true" /> Sales talking points
            </h2>
            <p>For the conversation — not printed on the report.</p>
          </div>
          <div className="talking__pitch">
            <p className="talking__sub">Opening pitch</p>
            <p>“{report.pitch[0]} {report.pitch[1]}”</p>
          </div>
          <ol className="talking__list">
            {report.improvements.map((i, n) => (
              <li key={i.id}>
                <span className="talking__num">{n + 1}</span>
                <p>“{i.talkingPoint}”</p>
              </li>
            ))}
          </ol>
          <h3 className="talking__sub">Questions to ask</h3>
          <ul className="talking__questions">
            {report.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
          <Button block icon={Copy} onClick={() => void copy('talking', talkingPoints)}>
            {copied === 'talking' ? 'Copied' : 'Copy Talking Points'}
          </Button>
        </aside>
      </div>
    </div>
  )
}
