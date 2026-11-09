import { Ban, CircleAlert, Clock, PlugZap, ShieldAlert, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { AnalysisErrorCode } from '../../services/tabService'

const COPY: Record<AnalysisErrorCode, { icon: LucideIcon; title: string; body: string }> = {
  'not-extension': {
    icon: PlugZap,
    title: 'Live analysis runs inside the extension',
    body: 'You are viewing the interface in development preview. Load the built dist/ folder in Chrome to analyse real pages.',
  },
  'no-tab': {
    icon: CircleAlert,
    title: 'No active tab found',
    body: 'Open a business website in the current window, then try again.',
  },
  internal: {
    icon: Ban,
    title: "This page can't be analysed.",
    body: 'Browser pages such as chrome://, extension pages and the new-tab page are protected. Open a public business website and try again.',
  },
  restricted: {
    icon: ShieldAlert,
    title: 'This page is restricted',
    body: 'Chrome does not allow extensions to read this page (for example the Chrome Web Store, local files or the PDF viewer).',
  },
  'no-content-script': {
    icon: PlugZap,
    title: "Couldn't connect to the page",
    body: 'The page scanner could not start. Reload the page, wait for it to finish loading and try again.',
  },
  'no-response': {
    icon: Clock,
    title: "The website didn't respond",
    body: 'The page may still be loading or is unusually large. Wait for it to finish loading and try again.',
  },
  'invalid-url': {
    icon: CircleAlert,
    title: "That doesn't look like a website address",
    body: 'Enter a public website such as example.com.au or https://www.example.com.au.',
  },
  'permission-denied': {
    icon: ShieldAlert,
    title: 'Permission needed',
    body: 'Chrome needs your permission to open and read this website. Try again and click Allow.',
  },
  failed: {
    icon: CircleAlert,
    title: 'Analysis failed',
    body: 'Something went wrong while reading this page.',
  },
}

export function AnalysisErrorView({ code, message, actions }: { code: AnalysisErrorCode; message?: string; actions?: ReactNode }) {
  const copy = COPY[code]
  const Icon = copy.icon
  return (
    <div className="error-state" role="alert">
      <span className="error-state__icon">
        <Icon size={20} aria-hidden="true" />
      </span>
      <h2 className="error-state__title">{copy.title}</h2>
      <p className="error-state__body">{copy.body}</p>
      {code === 'failed' && message && <p className="error-state__detail mono">{message}</p>}
      {actions && <div className="error-state__actions">{actions}</div>}
    </div>
  )
}
