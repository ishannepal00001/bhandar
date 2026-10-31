// hooks: query keys shared by the queries and the hooks that refresh them
// refreshJobs(): Refetches everything that shows jobs. Called when a job is queued, finishes or is deleted.
import type { QueryClient } from '@tanstack/react-query'

export const queryKeys = {
  dashboard: ['dashboard'],
  downloads: ['downloads'],
} as const

export function refreshJobs(queryClient: QueryClient): Promise<void[]> {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard }),
    queryClient.invalidateQueries({ queryKey: queryKeys.downloads }),
  ])
}
