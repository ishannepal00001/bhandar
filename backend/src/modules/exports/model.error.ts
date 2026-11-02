// exports: errors for the model

export class ExportsModelError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'ExportsModelError'
  }
}
