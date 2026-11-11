import { useMemo, useState } from 'react'
import { ClipboardCopy, Copy, Download, FileText, Printer } from 'lucide-react'
import { useClipboard } from '../../hooks/useClipboard'
import { useSavedKeywordReport } from '../../hooks/useSavedKeywordReport'
import type { ModuleProps } from '../../pages/dashboardRoutes'
import { reportService } from '../../services/reportService'
import { Button } from '../ui/Button'
import { EmptyState } from '../ui/Primitives'
import { ReportDocument } from './ReportDocument'
import { RankingsTable, SearchCompetitorTables } from './SearchCompetitorTables'

export default function ReportModule({ analysis }: ModuleProps) {
  const [generated, setGenerated] = useState(false)
  const { copy, copied, failed } = useClipboard()
  const keywords = useSavedKeywordReport(analysis)
  const report = useMemo(() => reportService.build(analysis), [analysis])

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
          An internal sales and research report built from the detected signals: an executive summary, website findings,
          and the SEO problems with Google rankings and competitors. It makes no unsupported promises.
        </p>
      </header>

      <div className="report-toolbar no-print">
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
        <ReportDocument
          report={report}
          extras={{
            seo: keywords && (
              <>
                <RankingsTable report={keywords} sectionClass="report-document__sub" headingClass="report-document__h3" heading="h3" />
                <SearchCompetitorTables
                  analysis={analysis}
                  report={keywords}
                  sectionClass="report-document__sub"
                  headingClass="report-document__h3"
                  heading="h3"
                />
              </>
            ),
          }}
        />
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
            Includes an executive summary, website findings, and the SEO problems with the latest Google rankings and
            competitors. Print to save as PDF.
          </EmptyState>
        </section>
      )}
    </div>
  )
}
