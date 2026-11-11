// hooks: the one fetch wrapper every hook calls
// apiUrl(): Also used for the EventSource, which can't go through fetch.
// request(): Always sends the cookie; /api is proxied through this origin (Vite in dev, a Pages Function in
//   production), so the cookie is first-party. Every non-GET is sent
//   as JSON, even with no body, so it never looks like a form post to the backend's CSRF check. A non-JSON error body
//   (e.g. the CSRF 403) falls back to the status text. Every failure becomes an ApiError with a message a person can
//   act on: no answer at all (offline, server down) is status 0, and a success that isn't JSON (e.g. an HTML page from
//   a wrong api.baseUrl) is refused rather than handed to the page as data.
import { config } from '../config'
import { ApiError } from './request.error'
import type { ErrorResponse, RequestOptions } from './request.types'

export function apiUrl(path: string): string {
  return `${config.api.baseUrl}/api/v1${path}`
}

export async function request<T>(path: string, { method = 'GET', body }: RequestOptions = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(apiUrl(path), {
      method,
      credentials: 'include',
      headers: method === 'GET' ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    })
  } catch {
    throw new ApiError("Can't reach Bhandar right now. Check your internet connection and try again.", 0)
  }

  const isJson = res.headers.get('Content-Type')?.includes('application/json') ?? false
  const data: unknown = isJson ? await res.json().catch(() => null) : null
  if (!res.ok) {
    const error = data as ErrorResponse | null
    throw new ApiError(error?.error ?? fallbackMessage(res.status), res.status, error?.issues)
  }
  if (data === null) {
    throw new ApiError('Bhandar sent back something unexpected. Try again in a moment.', res.status)
  }
  return data as T
}

function fallbackMessage(status: number): string {
  if (status === 403) return "You're not allowed to do that. Try reloading the page."
  if (status === 404) return "That couldn't be found. It may have been deleted."
  if (status === 429) return 'Too many requests. Wait a minute and try again.'
  if (status >= 500) return 'Something went wrong on our side. Try again in a moment.'
  return 'Something went wrong. Try again.'
}
