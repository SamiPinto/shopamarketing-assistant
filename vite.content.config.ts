import { resolve } from 'node:path'
import { defineConfig } from 'vite'

// Builds the content script as one IIFE file. Chrome injects it on demand via
// chrome.scripting.executeScript, which does not support ES module imports.
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'es2022',
    copyPublicDir: false,
    lib: {
      entry: resolve(import.meta.dirname, 'src/content/contentScript.ts'),
      formats: ['iife'],
      name: 'ShopaContentScript',
      fileName: () => 'content.js',
    },
  },
})
