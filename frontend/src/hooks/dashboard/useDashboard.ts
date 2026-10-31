// hooks: GET /dashboard; stats, queued jobs and recent ones, refetched by useDownloadEvents as jobs finish
// dashboardQuery: Shared with the dashboard route's loader, which can't call hooks.
import { queryOptions, useQuery } from '@tanstack/react-query'
import type { Dashboard } from '../../types/dashboard'
import { queryKeys } from '../queryKeys'
import { request } from '../request'

export const dashboardQuery = queryOptions({
  queryKey: queryKeys.dashboard,
  queryFn: () => request<Dashboard>('/dashboard'),
})

export function useDashboard() {
  return useQuery(dashboardQuery)
}
