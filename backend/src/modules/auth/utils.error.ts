// auth: errors for the helpers

export class AuthUtilsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AuthUtilsError'
  }
}
