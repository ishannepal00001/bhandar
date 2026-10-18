// auth: request handling, validated against schema
import { z } from 'zod'
import { loginRequestSchema } from '../../../schemas/auth'
import * as authService from './service'
import { AuthServiceError } from './service'
import type { LoginResult } from './type'

export class AuthControllerError extends Error {
  constructor(
    message: string,
    readonly status: 400 | 401 | 500,
    readonly issues?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'AuthControllerError'
  }
}

export async function login(body: unknown): Promise<LoginResult> {
  const parsed = loginRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw new AuthControllerError('Invalid request', 400, z.flattenError(parsed.error).fieldErrors)
  }

  try {
    return await authService.login(parsed.data)
  } catch (err) {
    if (!(err instanceof AuthServiceError)) throw err
    if (err.kind === 'INVALID_CODE') throw new AuthControllerError(err.message, 401)
    throw new AuthControllerError(err.message, 500)
  }
}
