import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/instrument-sans/standard.css'
import '../styles/index.css'
import '../styles/dashboard.css'
import '../styles/client-report.css'
import '../styles/website.css'
import '../styles/print.css'
import { AuthGate } from '../components/auth/AuthGate'
import { startPageDevReload } from '../utils/devReload'
import { Dashboard } from './Dashboard'

startPageDevReload()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGate variant="page">
      <Dashboard />
    </AuthGate>
  </StrictMode>,
)
