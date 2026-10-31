// Errors for the /api/v1/dashboard routes.
import type { ContentfulStatusCode } from 'hono/utils/http-status'

export class DashboardRouteError extends Error {
  constructor(
    message: string,
    readonly status: ContentfulStatusCode,
  ) {
    super(message)
    this.name = 'DashboardRouteError'
  }
}
