// hooks: the one fetch wrapper every hook calls
// apiUrl(): Also used for the EventSource, which can't go through fetch.
// request(): Always sends the cookie, since the frontend and the Worker are on different sites. Every non-GET is sent
//   as JSON, even with no body, so it never looks like a form post to the backend's CSRF check. A non-JSON error body
//   (e.g. the CSRF 403) falls back to the status text.
import { config } from '../config'
import { ApiError } from './request.error'
import type { ErrorResponse, RequestOptions } from './request.types'

export function apiUrl(path: string): string {
  return `${config.api.baseUrl}/api/v1${path}`
}

export async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  const res = await fetch(apiUrl(path), {
    method,
    credentials: 'include',
    headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    const error = data as ErrorResponse | null
    throw new ApiError(error?.error ?? res.statusText, res.status, error?.issues)
  }
  return data as T
}
