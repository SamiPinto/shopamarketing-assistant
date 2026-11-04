import { useState, type FormEvent } from 'react'
import { Globe, ScanSearch } from 'lucide-react'
import { SCAN_STEPS, useAnalysis } from '../../hooks/analysisContextValue'
import { Button } from '../ui/Button'

const ERROR_COPY: Partial<Record<string, string>> = {
  'invalid-url': 'Enter a valid website, e.g. example.com.au',
  'permission-denied': 'Site access was not granted — click Allow when Chrome asks.',
  'no-response': 'The website took too long to load.',
  restricted: 'Chrome does not allow this page to be read.',
  internal: 'Browser pages cannot be analysed.',
  'not-extension': 'URL analysis only works inside the installed extension.',
}

/** Analyse any website by URL from the dashboard, without visiting it first. */
export function UrlAnalyseForm({ variant = 'inline' }: { variant?: 'inline' | 'hero' }) {
  const { analyseUrl, run } = useAnalysis()
  const [value, setValue] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const running = run.phase === 'running'

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    setSubmitted(true)
    void analyseUrl(value).then((result) => result && setValue(''))
  }

  const error = submitted && run.phase === 'error' && run.error ? (ERROR_COPY[run.error.code] ?? run.error.message) : null

  return (
    <form className={`url-form url-form--${variant}`} onSubmit={onSubmit} role="search" aria-label="Analyse a website by URL">
      <div className="url-form__row">
        <label className="url-form__field">
          <Globe size={15} aria-hidden="true" />
          <span className="sr-only">Website URL</span>
          <input
            type="text"
            inputMode="url"
            autoComplete="url"
            spellCheck={false}
            placeholder="Enter a website URL, e.g. example.com.au"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={running}
            aria-invalid={Boolean(error)}
          />
        </label>
        <Button type="submit" variant="primary" size={variant === 'hero' ? 'md' : 'sm'} icon={ScanSearch} disabled={running || !value.trim()}>
          {running && submitted ? 'Analysing…' : 'Analyse'}
        </Button>
      </div>
      {running && submitted && (
        <p className="url-form__status" role="status">
          {SCAN_STEPS[run.step] ?? SCAN_STEPS[0]}…
        </p>
      )}
      {error && (
        <p className="url-form__error form-error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
