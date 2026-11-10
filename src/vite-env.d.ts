/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_RELOAD?: string
  /** DataForSEO API login (the account email). From .env. */
  readonly VITE_DATAFORSEO_LOGIN?: string
  /** DataForSEO API password (from app.dataforseo.com › API Access, not the website password). From .env. */
  readonly VITE_DATAFORSEO_PASSWORD?: string
}
