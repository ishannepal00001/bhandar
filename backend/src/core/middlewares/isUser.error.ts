// Errors for the isUser middleware.

export class IsUserError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 500,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'IsUserError'
  }
}
