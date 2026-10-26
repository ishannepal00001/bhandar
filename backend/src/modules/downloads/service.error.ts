// downloads: errors for the service
import type { DownloadsServiceErrorKind } from './type'

export class DownloadsServiceError extends Error {
  constructor(
    message: string,
    readonly kind: DownloadsServiceErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'DownloadsServiceError'
  }
}
