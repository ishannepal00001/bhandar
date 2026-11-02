// hooks: GET /exports/:id/file; a short-lived link to the rendered video
// useExportFile(): A mutation, not a query, because it runs on click and the link expires, so it mustn't be cached.
//   The caller opens the returned url.
import { useMutation } from '@tanstack/react-query'
import type { FileLink } from '../../types/downloads'
import { notifyError } from '../notify'
import { request } from '../request'

export function useExportFile() {
  return useMutation({
    mutationFn: (id: string) => request<FileLink>(`/exports/${encodeURIComponent(id)}/file`),
    onError: notifyError,
  })
}
