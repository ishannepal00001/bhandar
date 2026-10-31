// facades: the downloads' junction; call its hooks and store functions as downloadsFacade.useDownloads()
// downloadsQuery: For the route's loader: context.queryClient.ensureQueryData(downloadsFacade.downloadsQuery).
// useDownloadStore: Read the link and filter with downloadsFacade.useDownloadStore((state) => state.url).
// setUrl, setFilter, reset: Taken once from the store; zustand actions never change, so they're safe to call anywhere.
import { useDeleteDownload } from '../hooks/downloads/useDeleteDownload'
import { useDownloadEvents } from '../hooks/downloads/useDownloadEvents'
import { useDownloadFile } from '../hooks/downloads/useDownloadFile'
import { downloadsQuery, useDownloads } from '../hooks/downloads/useDownloads'
import { useStartDownload } from '../hooks/downloads/useStartDownload'
import { useDownloadStore } from '../stores/useDownloadStore'

const { setUrl, setFilter, reset } = useDownloadStore.getState()

export const downloadsFacade = {
  downloadsQuery,
  useDownloads,
  useStartDownload,
  useDownloadFile,
  useDeleteDownload,
  useDownloadEvents,
  useDownloadStore,
  setUrl,
  setFilter,
  reset,
}
