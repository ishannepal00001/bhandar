// hooks: POST /uploads, the file's PUT to B2, then POST /uploads/:id/complete; resolves with the upload's id
// putFile(): XMLHttpRequest rather than fetch, because only it reports upload progress. It goes straight to B2, with no
//   cookie, so the bucket's CORS rules have to allow PUT from this origin.
// useUploadVideo(): The caller passes onProgress (0 to 1) and gets the id back to export from. Errors toast like every
//   other hook; a failed PUT says so plainly, since B2 doesn't give a readable reason.
import { useMutation } from '@tanstack/react-query'
import type { CompleteResult, UploadTicket } from '../../types/uploads'
import { notifyError } from '../notify'
import { request } from '../request'

type UploadInput = { file: File; onProgress: (fraction: number) => void }

function putFile(ticket: UploadTicket, file: File, onProgress: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', ticket.url)
    for (const [name, value] of Object.entries(ticket.headers)) xhr.setRequestHeader(name, value)
    xhr.upload.onprogress = (event) => event.lengthComputable && onProgress(event.loaded / event.total)
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`))
    xhr.onerror = () => reject(new Error('Upload failed: storage could not be reached'))
    xhr.send(file)
  })
}

export function useUploadVideo() {
  return useMutation({
    mutationFn: async ({ file, onProgress }: UploadInput) => {
      const ticket = await request<UploadTicket>('/uploads', {
        method: 'POST',
        body: { name: file.name, content_type: file.type || 'video/mp4', size: file.size },
      })
      await putFile(ticket, file, onProgress)
      const result = await request<CompleteResult>(`/uploads/${encodeURIComponent(ticket.id)}/complete`, {
        method: 'POST',
      })
      return result.id
    },
    onError: notifyError,
  })
}
