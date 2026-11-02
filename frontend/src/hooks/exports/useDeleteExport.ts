// hooks: DELETE /exports/:id; removes the rendered video from B2 and the export from the list
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DeleteResult } from '../../types/downloads'
import { notifyError, notifySuccess } from '../notify'
import { refreshExports } from '../queryKeys'
import { request } from '../request'

export function useDeleteExport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request<DeleteResult>(`/exports/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => {
      notifySuccess('Export deleted')
      return refreshExports(queryClient)
    },
    onError: notifyError,
  })
}
