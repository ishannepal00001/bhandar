// hooks: POST /exports; queues a render of the clips and returns the queued export
// onSuccess: Refetches so the export shows as rendering right away; it finishes when useExportEvents hears it.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { ExportRequest, QueuedExport } from '../../types/exports'
import { notifyError, notifySuccess } from '../notify'
import { refreshExports } from '../queryKeys'
import { request } from '../request'

export function useStartExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: ExportRequest) => request<QueuedExport>('/exports', { method: 'POST', body: input }),
    onSuccess: () => {
      notifySuccess('Export queued')
      return refreshExports(queryClient)
    },
    onError: notifyError,
  })
}
