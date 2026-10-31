// hooks: POST /downloads; queues a link and returns the queued job
// onSuccess: Refetches so the job shows in the queue right away; it leaves the queue when useDownloadEvents hears it
//   finish.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { DownloadRequest, QueuedJob } from '../../types/downloads'
import { refreshJobs } from '../queryKeys'
import { notifyError, notifySuccess } from '../notify'
import { request } from '../request'

export function useStartDownload() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: DownloadRequest) => request<QueuedJob>('/downloads', { method: 'POST', body: input }),
    onSuccess: () => {
      notifySuccess('Download queued')
      return refreshJobs(queryClient)
    },
    onError: notifyError,
  })
}
