// uploads: errors for the service
import type { UploadsServiceErrorKind } from './service.types'

export class UploadsServiceError extends Error {
  constructor(
    message: string,
    readonly kind: UploadsServiceErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'UploadsServiceError'
  }
}
