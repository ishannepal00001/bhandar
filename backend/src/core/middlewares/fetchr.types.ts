// Types for the fetchr middleware.
// FetchrEnv: The wrangler.jsonc bindings Fetchr reads: DOWNLOADER_* vars and the seed code secret. Pass env.
// FetchrCodeStore: Where the rolling code lives between requests, e.g. a Durable Object's storage.kv.

export type FetchrEnv = Record<'DOWNLOADER_URL' | 'DOWNLOADER_CLIENT_ID' | 'DOWNLOADER_SEED_CODE', string> & {
  DOWNLOADER_TIMEOUT_SECONDS: number
}

export type FetchrCodeStore = {
  get(): string | undefined
  put(code: string): void
}
