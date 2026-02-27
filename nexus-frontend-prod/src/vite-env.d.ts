/// <reference types="vite/client" />

declare interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_USE_MOCKS?: string
  readonly VITE_BYPASS_AUTH?: string
  readonly VITE_AUTH_TOKEN?: string
}

declare interface ImportMeta {
  readonly env: ImportMetaEnv
}
