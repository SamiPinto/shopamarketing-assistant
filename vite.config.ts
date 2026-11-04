import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

const root = import.meta.dirname

// Main extension build: popup + dashboard pages and the MV3 service worker.
// The content script is built separately (vite.content.config.ts) because it
// must be a single self-contained classic script with no module imports.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rolldownOptions: {
      input: {
        popup: resolve(root, 'popup.html'),
        dashboard: resolve(root, 'dashboard.html'),
        background: resolve(root, 'src/background/background.ts'),
      },
      output: {
        entryFileNames: (chunk) =>
          chunk.name === 'background' ? 'background.js' : 'assets/[name]-[hash].js',
        codeSplitting: {
          groups: [{ name: 'vendor', test: /node_modules[\\/](react|react-dom|scheduler|lucide-react)[\\/]/ }],
        },
      },
    },
  },
  server: {
    open: '/popup.html',
  },
})
