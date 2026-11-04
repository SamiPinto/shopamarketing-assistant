import { useMemo, useState } from 'react'
import { ClipboardCopy, Copy, Download, FileText, Printer } from 'lucide-react'
import { useAnalysis } from '../../hooks/analysisContextValue'
import { useClipboard } from '../../hooks/useClipboard'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { reportService } from '../../services/reportService'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/Primitives'
import { ReportDocument } from './ReportDocument'

export default function ReportModule({ analysis }: ModuleProps) {
  const { settings, updateSettings } = useAnalysis()
  const [generated, setGenerated] = useState(false)
  const { copy, copied, failed } = useClipboard()
  const report = useMemo(() => reportService.build(analysis, settings.preparedBy), [analysis, settings.preparedBy])

  return (
    <div className="module">
      <header className="module-header no-print">
        <div className="module-header__title-row">
          <span className="module-header__icon">
            <FileText size={18} aria-hidden="true" />
          </span>
          <h1 className="module-header__title">Opportunity Report</h1>
        </div>
        <p className="module-header__description">
          An internal sales and research report built from the detected signals. It makes no unsupported promises and
          clearly separates potential service fit from confirmed need.
        </p>
      </header>

      <div className="report-toolbar no-print">
        <label className="field field--inline">
          <span className="field__label">Prepared by</span>
          <input
            type="text"
            value={settings.preparedBy}
            placeholder="Your name (optional)"
            onChange={(e) => void updateSettings({ preparedBy: e.target.value })}
          />
        </label>
        {generated && (
          <div className="button-row">
            <Button size="sm" icon={Copy} onClick={() => void copy('summary', reportService.summary(analysis))}>
              {copied === 'summary' ? 'Copied' : 'Copy Summary'}
            </Button>
            <Button size="sm" icon={ClipboardCopy} onClick={() => void copy('full', reportService.toText(report))}>
              {copied === 'full' ? 'Copied' : 'Copy Full Report'}
            </Button>
            <Button size="sm" icon={Printer} onClick={() => window.print()}>
              Print Report
            </Button>
            <Button
              size="sm"
              variant="primary"
              icon={Download}
              onClick={() => reportService.download(reportService.filename(report, 'md'), reportService.toMarkdown(report))}
            >
              Export Report
            </Button>
          </div>
        )}
      </div>
      {failed && (
        <p className="form-error no-print" role="alert">
          Clipboard access was blocked by the browser. Use Export Report instead.
        </p>
      )}

      {generated ? (
        <ReportDocument report={report} />
      ) : (
        <section className="panel no-print">
          <EmptyState
            icon={FileText}
            title="Generate the client opportunity report"
            action={
              <Button variant="primary" icon={FileText} onClick={() => setGenerated(true)}>
                Generate Opportunity Report
              </Button>
            }
          >
            Includes an executive summary, findings for each category, potential Shopa services,
            next steps and the information still required. Print to save as PDF.
          </EmptyState>
        </section>
      )}
    </div>
  )
}
