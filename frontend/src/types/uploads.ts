// Uploads as the Worker handles them (backend/API.md, Uploads): the browser sends the file straight to B2.
// UploadTicket: Where and how to send the file: a PUT to url with exactly these headers.
export type UploadRequest = { name: string; content_type: string; size: number }

export type UploadTicket = { id: string; url: string; headers: Record<string, string> }

export type CompleteResult = { id: string; status: 'ready' }
