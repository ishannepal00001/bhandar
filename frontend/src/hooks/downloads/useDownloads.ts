// hooks: GET /downloads; every job, queued first, refetched by useDownloadEvents as jobs finish
// downloadsQuery: Shared with the downloads route's loader, which can't call hooks.
import { queryOptions, useQuery } from '@tanstack/react-query'
import type { Job } from '../../types/downloads'
import { queryKeys } from '../queryKeys'
import { request } from '../request'

export const downloadsQuery = queryOptions({
  queryKey: queryKeys.downloads,
  queryFn: () => request<Job[]>('/downloads'),
})

export function useDownloads() {
  return useQuery(downloadsQuery)
}
