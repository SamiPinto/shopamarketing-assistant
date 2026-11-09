// Rebuilds the extension (pages, service worker and content script) on change
// and serves a build stamp that the extension polls to reload itself.
import { createServer } from 'node:http'
import { build } from 'vite'

const PORT = 35729
let stamp = String(Date.now())
let bumpTimer

// Both builds can finish for one save; settle before bumping so Chrome reloads once.
const bumpStamp = () => {
  clearTimeout(bumpTimer)
  bumpTimer = setTimeout(() => {
    stamp = String(Date.now())
    console.log(`[watch] rebuilt, extension will reload (${new Date().toLocaleTimeString()})`)
  }, 400)
}

createServer((req, res) => {
  res.writeHead(200, { 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store', 'Content-Type': 'text/plain' })
  res.end(stamp)
}).listen(PORT, '127.0.0.1', () => console.log(`[watch] auto reload on http://127.0.0.1:${PORT}`))

process.env.VITE_DEV_RELOAD = 'true'
const reloadPlugin = { name: 'shopa-dev-reload', closeBundle: bumpStamp }

await build({ configFile: 'vite.config.ts', plugins: [reloadPlugin], build: { watch: {}, emptyOutDir: false } })
await build({ configFile: 'vite.content.config.ts', plugins: [reloadPlugin], build: { watch: {} } })
