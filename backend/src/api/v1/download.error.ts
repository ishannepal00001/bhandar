// Errors for the /api/v1/downloads routes.
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class DownloadsRouteError extends Error {
  constructor(
    message: string,
    readonly status: ContentfulStatusCode,
    readonly issues?: Partial<Record<string, string[]>>,
  ) {
    super(message)
    this.name = 'DownloadsRouteError'
  }
}
