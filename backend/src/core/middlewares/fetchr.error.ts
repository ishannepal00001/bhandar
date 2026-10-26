// Errors for the fetchr middleware.

export class FetchrError extends Error {
  constructor(
    message: string,
    readonly status?: number,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'FetchrError'
  }
}
