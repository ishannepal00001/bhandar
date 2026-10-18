// auth: business logic
import type { LoginRequest } from '../../../schemas/auth'
import * as authModel from './model'
import { AuthModelError } from './model'
import type { AuthServiceErrorKind, LoginResult } from './type'

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

export async function login(input: LoginRequest): Promise<LoginResult> {
  let loginCode: authModel.LoginCode | undefined
  try {
    loginCode = await authModel.findLoginCode(input.code)
  } catch (err) {
    if (!(err instanceof AuthModelError)) throw err
    throw new AuthServiceError('Could not verify code', 'DB_ERROR', { cause: err })
  }

  if (!loginCode) throw new AuthServiceError('Invalid code', 'INVALID_CODE')
  return { authenticated: true }
}
