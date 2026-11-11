/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DEV_RELOAD?: string
  /** DataForSEO API login (the account email). From .env. */
  readonly VITE_DATAFORSEO_LOGIN?: string
  /** DataForSEO API password (from app.dataforseo.com › API Access, not the website password). From .env. */
  readonly VITE_DATAFORSEO_PASSWORD?: string
  /** Microsoft Entra app registration: Application (client) ID. From .env. */
  readonly VITE_MS_CLIENT_ID?: string
  /** Microsoft Entra: Directory (tenant) ID. From .env. */
  readonly VITE_MS_TENANT_ID?: string
}
