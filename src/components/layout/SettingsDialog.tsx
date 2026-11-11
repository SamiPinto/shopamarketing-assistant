import { useState } from 'react'
import { ExternalLink, Settings } from 'lucide-react'
import { useAnalysis } from '../../hooks/analysisContextValue'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'

export function SettingsButton() {
  const [open, setOpen] = useState(false)
  const { settings, updateSettings } = useAnalysis()

  return (
    <>
      <button type="button" className="btn btn--ghost btn--sm btn--icon" aria-label="Settings" title="Settings" onClick={() => setOpen(true)}>
        <Settings size={16} aria-hidden="true" />
      </button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Settings"
        description="Saved in this browser only."
        footer={
          <>
            <span />
            <Button variant="primary" onClick={() => setOpen(false)}>
              Done
            </Button>
          </>
        }
      >
        <div className="form">
          <div className="form__grid">
            <label className="field">
              <span className="field__label">Contact line (on reports)</span>
              <input type="text" value={settings.contactLine} placeholder="email · phone" onChange={(e) => void updateSettings({ contactLine: e.target.value })} />
            </label>
          </div>

          <label className="setting-toggle">
            <input type="checkbox" checked={settings.onlineLookups} onChange={(e) => void updateSettings({ onlineLookups: e.target.checked })} />
            <span>
              <strong>Online lookups</strong>
              <span className="field__hint">
                Look up domain provider, registration date, hosting, DNS/email provider and “online since” using free public services (RDAP, Google DNS, Internet Archive). Only the
                website’s domain name is sent.
              </span>
            </span>
          </label>

          <label className="field field--full">
            <span className="field__label">Google PageSpeed API key (optional)</span>
            <input
              type="password"
              autoComplete="off"
              value={settings.pageSpeedApiKey}
              placeholder="Paste a free API key to enable Google PageSpeed scores"
              onChange={(e) => void updateSettings({ pageSpeedApiKey: e.target.value })}
            />
            <span className="field__hint">
              Without a key, page speed is still measured in your browser. Google’s shared free quota is often exhausted, so a free key is recommended.{' '}
              <a className="link" href="https://developers.google.com/speed/docs/insights/v5/get-started#APIKey" target="_blank" rel="noreferrer noopener">
                Get a free key <ExternalLink size={11} aria-hidden="true" />
              </a>
            </span>
          </label>
        </div>
      </Modal>
    </>
  )
}
