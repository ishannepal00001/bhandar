// auth: errors for the controller

export class AuthControllerError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 500 | 502,
    readonly issues?: Partial<Record<string, string[]>>,
  ) {
    super(message)
    this.name = 'AuthControllerError'
  }
}
