// hooks: query keys shared by the queries and the hooks that refresh them
// refreshJobs(): Refetches everything that shows jobs. Called when a job is queued, finishes or is deleted.
// refreshExports(): The same for exports, which only show in their own list.
import type { QueryClient } from '@tanstack/react-query'

export const queryKeys = {
  dashboard: ['dashboard'],
  downloads: ['downloads'],
  exports: ['exports'],
} as const

export function refreshJobs(queryClient: QueryClient): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.downloads }),
  ])
}

export function refreshExports(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({ queryKey: queryKeys.exports })
}
