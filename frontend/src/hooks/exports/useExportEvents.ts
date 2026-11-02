// hooks: GET /exports/events; keeps the exports query fresh while mounted. Mount it once, in the logged-in layout.
// finalStatuses: The SSE event names. Every event is named, so onmessage never fires.
// useExportEvents(): Refetches instead of patching the cache, and on every open too, since events sent while the
//   stream was down are lost; that refetch shows no toast.
// notifyFinished(): One toast per finished export, named by its source's title.
import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import type { FinalStatus } from '../../types/downloads'
import type { FinishedExport } from '../../types/exports'
import { exportTitle } from '../../utils/exports'
import { refreshExports } from '../queryKeys'
import { apiUrl } from '../request'

const finalStatuses: FinalStatus[] = ['completed', 'failed', 'cancelled']

function notifyFinished(item: FinishedExport): void {
  const title = exportTitle(item)
  if (item.status === 'completed') toast.success(`Exported “${title}”`)
  else if (item.status === 'failed') toast.error(`Export failed: ${title}`, { description: item.error ?? undefined })
  else toast(`Export cancelled: ${title}`)
}

export function useExportEvents(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const source = new EventSource(apiUrl('/exports/events'), { withCredentials: true })
    const refresh = () => void refreshExports(queryClient)
    const onFinished = (event: MessageEvent<string>) => {
      notifyFinished(JSON.parse(event.data) as FinishedExport)
      refresh()
    }
    source.addEventListener('open', refresh)
    for (const status of finalStatuses) source.addEventListener(status, onFinished)
    return () => source.close()
  }, [queryClient])
}
