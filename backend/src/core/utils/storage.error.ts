// Errors for the Storage class.

export class StorageError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 500 = 500,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'StorageError'
  }
}
