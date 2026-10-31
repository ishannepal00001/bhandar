// routes: loads a route's data before its page renders
// loadQuery(): Uses the cached data if there is any (restored from localStorage, or from an earlier visit) and fetches
//   otherwise. A 401 means the cookie is missing or expired, so it sends the user to /auth instead of the page.
import type { QueryClient, QueryKey, UseQueryOptions } from '@tanstack/react-query'
import { redirect } from '@tanstack/react-router'
import { ApiError } from '../hooks/request.error'

export async function loadQuery<T, K extends QueryKey>(
  queryClient: QueryClient,
  options: UseQueryOptions<T, Error, T, K> & { queryKey: K },
): Promise<T> {
  try {
    return await queryClient.ensureQueryData(options)
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) throw redirect({ to: '/auth', replace: true })
    throw err
  }
}
