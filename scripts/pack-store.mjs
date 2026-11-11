// Packs dist/ for the Chrome Web Store as store.zip: manifest.json at the zip
// root and without the "key" field, which the Store rejects (it assigns the
// extension ID itself). Run after `npm run build`.
import { execFileSync } from 'node:child_process'
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const dist = resolve(root, 'dist')
const staging = resolve(root, 'node_modules/.tmp/store')
const zip = resolve(root, 'store.zip')

if (!existsSync(resolve(dist, 'manifest.json'))) throw new Error('dist/manifest.json not found. Run npm run build first.')

rmSync(staging, { recursive: true, force: true })
cpSync(dist, staging, { recursive: true })
const manifestPath = resolve(staging, 'manifest.json')
const { key: _key, ...manifest } = JSON.parse(readFileSync(manifestPath, 'utf8'))
writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

rmSync(zip, { force: true })
// bsdtar (built into Windows 10+, macOS) writes a standard zip with forward-slash paths.
// On Windows, call it by path: Git Bash's GNU tar can come first on PATH and can't write zips.
const tar = process.platform === 'win32' ? resolve(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar'
// Name each top-level entry so paths have no leading "./" (the Store looks for manifest.json at the root).
execFileSync(tar, ['-a', '-c', '-f', zip, '-C', staging, ...readdirSync(staging)], { stdio: 'inherit' })
rmSync(staging, { recursive: true, force: true })
console.log(`store.zip ready (version ${manifest.version}, no key field)`)
