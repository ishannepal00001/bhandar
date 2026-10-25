// Types for the Storage class.
export type StoredFile = {
  id: string
  size: number
  lastModified: string
}

export type StoredFileWithUrl = StoredFile & {
  contentType: string
  url: string
}

// The wrangler.jsonc bindings Storage reads: B2_* vars and secrets. Pass c.env.
export type StorageEnv = Record<'B2_KEY_ID' | 'B2_APP_KEY' | 'B2_BUCKET' | 'B2_ENDPOINT' | 'B2_REGION', string> & {
  STORAGE_URL_TTL_SECONDS: number
}
