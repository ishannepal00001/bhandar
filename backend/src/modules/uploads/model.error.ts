// uploads: errors for the model

export class UploadsModelError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'UploadsModelError'
  }
}
