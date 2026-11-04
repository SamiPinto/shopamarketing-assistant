import { useEffect, useState, type FormEvent } from 'react'
import { ArrowLeft, Copy, Download, FileText } from 'lucide-react'
import { OOH_ENVIRONMENTS } from '../../data/oohEnvironments'
import { useClipboard } from '../../hooks/useClipboard'
import { defaultBriefInput, oohService } from '../../services/oohService'
import { downloadTextFile } from '../../services/reportService'
import { storageService } from '../../services/storageService'
import type { MarketingAnalysis } from '../../types/analysis'
import type { OOHBrief, OOHBriefInput, OOHEnvironmentId } from '../../types/ooh'
import { slugify } from '../../utils/format'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { BriefDocument } from './BriefDocument'

interface Props {
  open: boolean
  analysis: MarketingAnalysis
  onClose(): void
  onGenerated(brief: OOHBrief): void
}

type TextKey = Exclude<keyof OOHBriefInput, 'environments'>

const FIELDS: { key: TextKey; label: string; placeholder: string; multiline?: boolean }[] = [
  { key: 'clientName', label: 'Client name', placeholder: 'e.g. ABC Retail' },
  { key: 'objective', label: 'Campaign objective', placeholder: 'e.g. Store launch awareness' },
  { key: 'location', label: 'Location', placeholder: 'e.g. Melbourne CBD and inner east' },
  { key: 'audience', label: 'Target audience', placeholder: 'e.g. 18–35, commuters, young families' },
  { key: 'budget', label: 'Budget', placeholder: 'e.g. To be confirmed with client' },
  { key: 'duration', label: 'Campaign duration', placeholder: 'e.g. 4 weeks' },
  { key: 'message', label: 'Campaign message', placeholder: 'The single idea the audience should remember', multiline: true },
  { key: 'cta', label: 'CTA', placeholder: 'e.g. Visit us in store this weekend' },
]

export function OOHBriefBuilder({ open, analysis, onClose, onGenerated }: Props) {
  const [input, setInput] = useState<OOHBriefInput>(() => defaultBriefInput(analysis))
  const [brief, setBrief] = useState<OOHBrief | null>(null)
  const { copy, copied } = useClipboard()
  const suggested = oohService.suggestEnvironments(analysis.business)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void storageService.getBriefDraft(analysis.id).then((draft) => {
      if (!cancelled && draft) setInput(draft)
    })
    return () => {
      cancelled = true
    }
  }, [open, analysis.id])

  function update<K extends keyof OOHBriefInput>(key: K, value: OOHBriefInput[K]) {
    setInput((prev) => ({ ...prev, [key]: value }))
  }

  function toggleEnvironment(id: OOHEnvironmentId) {
    update('environments', input.environments.includes(id) ? input.environments.filter((e) => e !== id) : [...input.environments, id])
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const next = oohService.buildBrief(input)
    void storageService.saveBriefDraft(analysis.id, input)
    setBrief(next)
    onGenerated(next)
  }

  const briefText = brief ? oohService.briefToText(brief) : ''

  return (
    <Modal
      open={open}
      onClose={onClose}
      wide
      title={brief ? 'OOH Campaign Brief' : 'Build OOH Campaign Brief'}
      description={
        brief
          ? 'Structured brief ready to share internally or with media owners.'
          : 'Capture what is known. Blank fields are marked "To be confirmed" in the brief.'
      }
      footer={
        brief ? (
          <>
            <Button variant="ghost" icon={ArrowLeft} onClick={() => setBrief(null)}>
              Edit brief
            </Button>
            <div className="button-row">
              <Button icon={Download} onClick={() => downloadTextFile(`ooh-brief-${slugify(input.clientName) || 'client'}.txt`, briefText, 'text/plain')}>
                Export Brief
              </Button>
              <Button variant="primary" icon={Copy} onClick={() => void copy('brief', briefText)}>
                {copied === 'brief' ? 'Copied' : 'Copy Brief'}
              </Button>
            </div>
          </>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" icon={FileText} type="submit" form="ooh-brief-form">
              Generate Brief
            </Button>
          </>
        )
      }
    >
      {brief ? (
        <BriefDocument brief={brief} />
      ) : (
        <form id="ooh-brief-form" className="form" onSubmit={handleSubmit}>
          <div className="form__grid">
            {FIELDS.map((f) => (
              <label key={f.key} className={`field${f.multiline ? ' field--full' : ''}`}>
                <span className="field__label">{f.label}</span>
                {f.multiline ? (
                  <textarea rows={3} value={input[f.key]} placeholder={f.placeholder} onChange={(e) => update(f.key, e.target.value)} />
                ) : (
                  <input type="text" value={input[f.key]} placeholder={f.placeholder} onChange={(e) => update(f.key, e.target.value)} />
                )}
              </label>
            ))}
          </div>
          <fieldset className="field field--full">
            <legend className="field__label">Preferred environments</legend>
            {suggested.length > 0 && (
              <p className="field__hint">
                Worth discussing first, based on detected context:{' '}
                {suggested.map((id) => OOH_ENVIRONMENTS.find((e) => e.id === id)?.label).join(', ')}.
              </p>
            )}
            <div className="checkbox-grid">
              {OOH_ENVIRONMENTS.map((env) => (
                <label key={env.id} className={`checkbox-card${input.environments.includes(env.id) ? ' checkbox-card--on' : ''}`}>
                  <input type="checkbox" checked={input.environments.includes(env.id)} onChange={() => toggleEnvironment(env.id)} />
                  <span>{env.label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </form>
      )}
    </Modal>
  )
}
