// exports: errors for the service
import type { ExportsServiceErrorKind } from './service.types'

export class ExportsServiceError extends Error {
  constructor(
    message: string,
    readonly kind: ExportsServiceErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'ExportsServiceError'
  }
}
