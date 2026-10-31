// hooks: GET /downloads/:id/file; a short-lived link to the video
// useDownloadFile(): A mutation, not a query, because it runs on click and the link expires
//   (STORAGE_URL_TTL_SECONDS), so it mustn't be cached. The caller opens the returned url.
import { useMutation } from '@tanstack/react-query'
import type { FileLink } from '../../types/downloads'
import { request } from '../request'

export function useDownloadFile() {
  return useMutation({
    mutationFn: (id: string) => request<FileLink>(`/downloads/${encodeURIComponent(id)}/file`),
  })
}
