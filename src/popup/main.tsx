import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/bricolage-grotesque/standard.css'
import '@fontsource-variable/instrument-sans/standard.css'
import '../styles/index.css'
import '../styles/popup.css'
import { isExtensionContext } from '../utils/chrome'
import { Popup } from './Popup'

// Outside the extension (npm run dev) the popup is framed at its real size.
if (!isExtensionContext()) document.body.classList.add('dev-preview')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Popup />
  </StrictMode>,
)
