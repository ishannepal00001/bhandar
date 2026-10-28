// downloads: errors for the controller

export class DownloadsControllerError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 404 | 409 | 429 | 500 | 502,
    readonly issues?: Partial<Record<string, string[]>>,
  ) {
    super(message)
    this.name = 'DownloadsControllerError'
  }
}
