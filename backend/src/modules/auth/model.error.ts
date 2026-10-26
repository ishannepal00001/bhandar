// auth: errors for the model

export class AuthModelError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AuthModelError'
  }
}
