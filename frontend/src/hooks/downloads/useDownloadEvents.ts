// hooks: GET /downloads/events; keeps the job queries fresh while mounted. Mount it once, in the logged-in layout.
// finalStatuses: The SSE event names. Every event is named, so onmessage never fires.
// useDownloadEvents(): Refetches instead of patching the cache, so the stats stay the server's. Also refetches on every
//   open, since events sent while the stream was down are lost; that refetch shows no toast.
// notifyFinished(): One toast per finished job, named by its title (or link).
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import type { FinalStatus, FinishedJob } from '../../types/downloads'
import { jobTitle } from '../../utils/jobs'
import { refreshJobs } from '../queryKeys'
import { apiUrl } from '../request'

const finalStatuses: FinalStatus[] = ['completed', 'failed', 'cancelled']

function notifyFinished(job: FinishedJob): void {
  const title = jobTitle(job)
  if (job.status === 'completed') toast.success(`Downloaded “${title}”`)
  else if (job.status === 'failed') toast.error(`Download failed: ${title}`, { description: job.error ?? undefined })
  else toast(`Download cancelled: ${title}`)
}

export function useDownloadEvents(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const source = new EventSource(apiUrl('/downloads/events'), { withCredentials: true })
    const refresh = () => void refreshJobs(queryClient)
    const onFinished = (event: MessageEvent<string>) => {
      notifyFinished(JSON.parse(event.data) as FinishedJob)
      refresh()
    }
    source.addEventListener('open', refresh)
    for (const status of finalStatuses) source.addEventListener(status, onFinished)
    return () => source.close()
  }, [queryClient])
}
