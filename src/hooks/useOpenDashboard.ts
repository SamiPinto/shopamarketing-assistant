import { useCallback } from 'react'
import type { OpenDashboardRequest } from '../types/misc'
import { isExtensionContext } from '../utils/chrome'

/** Opens (or focuses) the full dashboard tab, optionally at a section. */
export function useOpenDashboard() {
  return useCallback(async (section?: string) => {
    if (isExtensionContext()) {
      const request: OpenDashboardRequest = { type: 'shopa:open-dashboard', section }
      try {
        await chrome.runtime.sendMessage(request)
        window.close()
        return
      } catch {
        // Service worker unavailable: fall back to opening the tab directly.
        await chrome.tabs.create({ url: chrome.runtime.getURL(`dashboard.html${section ? `#${section}` : ''}`) })
        window.close()
        return
      }
    }
    window.open(`./dashboard.html${section ? `#${section}` : ''}`, '_blank', 'noopener')
  }, [])
}
