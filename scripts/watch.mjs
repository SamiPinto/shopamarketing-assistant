// Rebuilds the extension (pages, service worker and content script) on change.
// After each rebuild, reload the extension from chrome://extensions/.
import { build } from 'vite'

await build({ configFile: 'vite.config.ts', build: { watch: {}, emptyOutDir: false } })
await build({ configFile: 'vite.content.config.ts', build: { watch: {} } })
