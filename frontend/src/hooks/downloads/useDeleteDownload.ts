// hooks: DELETE /downloads/:id; removes the video from B2 and the job from the list
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DeleteResult } from '../../types/downloads'
import { refreshJobs } from '../queryKeys'
import { request } from '../request'

export function useDeleteDownload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => request<DeleteResult>(`/downloads/${encodeURIComponent(id)}`, { method: 'DELETE' }),
    onSuccess: () => refreshJobs(queryClient),
  })
}
