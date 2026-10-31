// hooks: errors for request()
// ApiError.issues: Field errors from a 400 "Invalid request", keyed by body field.

export class ApiError extends Error {
  readonly status: number
  readonly issues?: Partial<Record<string, string[]>>

  constructor(message: string, status: number, issues?: Partial<Record<string, string[]>>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.issues = issues
  }
}
