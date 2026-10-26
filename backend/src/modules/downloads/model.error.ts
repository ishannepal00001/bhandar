// downloads: errors for the model

export class DownloadsModelError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DownloadsModelError'
  }
}
