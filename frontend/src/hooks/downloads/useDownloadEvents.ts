// hooks: GET /downloads/events; keeps the job queries fresh while mounted. Mount it once, in the logged-in layout.
// finalStatuses: The SSE event names. Every event is named, so onmessage never fires.
// useDownloadEvents(): Refetches instead of patching the cache, so the stats stay the server's. Also refetches on every
//   open, since events sent while the stream was down are lost.
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import type { FinalStatus } from '../../types/downloads'
import { refreshJobs } from '../queryKeys'
import { apiUrl } from '../request'

const finalStatuses: FinalStatus[] = ['completed', 'failed', 'cancelled']

export function useDownloadEvents(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const source = new EventSource(apiUrl('/downloads/events'), { withCredentials: true })
    const refresh = () => void refreshJobs(queryClient)
    source.addEventListener('open', refresh)
    for (const status of finalStatuses) source.addEventListener(status, refresh)
    return () => source.close()
  }, [queryClient])
}
