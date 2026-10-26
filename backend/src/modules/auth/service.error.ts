// auth: errors for the service
import type { AuthServiceErrorKind } from './type'

export class AuthServiceError extends Error {
  constructor(
    message: string,
    readonly kind: AuthServiceErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'AuthServiceError'
  }
}
