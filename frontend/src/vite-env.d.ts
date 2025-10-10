/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SENTRY_DSN: string
  readonly VITE_NODE_ENV: string
  readonly VITE_SENTRY_RELEASE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_SENTRY_TRACES_SAMPLE_RATE: string
  readonly VITE_BUILD_NUMBER: string
  readonly VITE_MAIN_DOMAIN: string
  readonly MODE: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
