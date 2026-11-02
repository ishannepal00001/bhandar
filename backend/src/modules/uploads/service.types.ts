// uploads: types for the service
// UploadTicket: Where and how the browser sends the file: a PUT to url with exactly these headers.
export type UploadTicket = {
  id: string
  url: string
  headers: Record<string, string>
}

export type CompleteResult = { id: string; status: 'ready' }

export type UploadsServiceErrorKind = 'NOT_FOUND' | 'NOT_UPLOADED' | 'STORAGE_ERROR' | 'DB_ERROR'
