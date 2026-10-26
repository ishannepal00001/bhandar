// Errors for the rateLimit middleware.

export class RateLimitError extends Error {
  readonly status = 429

  constructor() {
    super('Too many requests, try again in a minute')
    this.name = 'RateLimitError'
  }
}
