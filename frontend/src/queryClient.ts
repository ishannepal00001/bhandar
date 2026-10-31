// The app's one QueryClient, and the persister that saves its responses to localStorage
// queryClient: gcTime matches cache.maxAgeMs; a shorter one would garbage-collect restored queries before they're used.
// persistOptions: Only successful queries are saved; mutations aren't. Restored data shows at once and is refetched.
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister'
import { QueryClient } from '@tanstack/react-query'
import type { PersistQueryClientOptions } from '@tanstack/react-query-persist-client'
import { config } from './config'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { gcTime: config.cache.maxAgeMs },
  },
})

export const persister = createAsyncStoragePersister({
  storage: window.localStorage,
  key: config.cache.storageKey,
})

export const persistOptions: Omit<PersistQueryClientOptions, 'queryClient'> = {
  persister,
  maxAge: config.cache.maxAgeMs,
}
