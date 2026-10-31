// hooks: types for request()
// ErrorResponse: The body of every backend error (backend/API.md, Conventions).
// RequestOptions.body: Sent as JSON.
export type ErrorResponse = {
  error: string
  issues?: Partial<Record<string, string[]>>
}

export type RequestOptions = {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: unknown
}
