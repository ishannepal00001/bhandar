// Errors for the /api/v1/exports routes.
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class ExportsRouteError extends Error {
  constructor(
    message: string,
    readonly status: ContentfulStatusCode,
    readonly issues?: Partial<Record<string, string[]>>,
  ) {
    super(message)
    this.name = 'ExportsRouteError'
  }
}
