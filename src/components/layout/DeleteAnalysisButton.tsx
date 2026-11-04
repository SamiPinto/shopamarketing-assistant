import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { useAnalysis } from '../../hooks/analysisContextValue'
import type { MarketingAnalysis } from '../../types/analysis'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'

/** Trash button that asks for confirmation before removing an analysis. */
export function DeleteAnalysisButton({ analysis }: { analysis: MarketingAnalysis }) {
  const { removeAnalysis } = useAnalysis()
  const [open, setOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const confirm = async () => {
    setDeleting(true)
    try {
      await removeAnalysis(analysis.id)
      setOpen(false)
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn btn--ghost btn--sm btn--icon"
        onClick={() => setOpen(true)}
        aria-label={`Remove ${analysis.business.name} from recent analyses`}
        title="Remove this analysis"
      >
        <Trash2 size={15} aria-hidden="true" />
      </button>
      <Modal
        open={open}
        onClose={() => !deleting && setOpen(false)}
        title="Delete this analysis?"
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={deleting} autoFocus>
              Cancel
            </Button>
            <Button className="btn--danger" icon={Trash2} onClick={() => void confirm()} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </>
        }
      >
        <p>
          <strong>{analysis.business.name}</strong> ({analysis.business.domain}) will be removed from your recent
          analyses. This can't be undone, but you can analyse the website again at any time.
        </p>
      </Modal>
    </>
  )
}
