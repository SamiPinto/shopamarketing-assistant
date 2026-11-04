import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/outfit'
import '../styles/index.css'
import '../styles/dashboard.css'
import '../styles/client-report.css'
import '../styles/website.css'
import '../styles/print.css'
import { Dashboard } from './Dashboard'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Dashboard />
  </StrictMode>,
)
