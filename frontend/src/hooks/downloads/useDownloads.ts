// hooks: GET /downloads; every job, queued first, refetched by useDownloadEvents as jobs finish
import { useQuery } from '@tanstack/react-query'
import type { Job } from '../../types/downloads'
import { queryKeys } from '../queryKeys'
import { request } from '../request'

export function useDownloads() {
  return useQuery({
    queryKey: queryKeys.downloads,
    queryFn: () => request<Job[]>('/downloads'),
  })
}
