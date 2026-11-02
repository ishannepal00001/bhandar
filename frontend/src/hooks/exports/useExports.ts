// hooks: GET /exports; every export, queued first, refetched by useExportEvents as exports finish
// exportsQuery: Shared with the editing route's loader, which can't call hooks.
import { queryOptions, useQuery } from '@tanstack/react-query'
import type { Export } from '../../types/exports'
import { queryKeys } from '../queryKeys'
import { request } from '../request'

export const exportsQuery = queryOptions({
  queryKey: queryKeys.exports,
  queryFn: () => request<Export[]>('/exports'),
})

export function useExports() {
  return useQuery(exportsQuery)
}
