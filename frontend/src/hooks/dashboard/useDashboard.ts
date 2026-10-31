// hooks: GET /dashboard; stats, queued jobs and recent ones, refetched by useDownloadEvents as jobs finish
import { useQuery } from '@tanstack/react-query'
import type { Dashboard } from '../../types/dashboard'
import { queryKeys } from '../queryKeys'
import { request } from '../request'

export function useDashboard() {
  return useQuery({
    queryKey: queryKeys.dashboard,
    queryFn: () => request<Dashboard>('/dashboard'),
  })
}
