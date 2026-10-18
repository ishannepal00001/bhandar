// auth: request handling, validated against schema
import type { Context } from 'hono'
import { deleteCookie } from 'hono/cookie'
import { z } from 'zod'
import { config } from '../../../config'
import { loginRequestSchema, sendOtpRequestSchema } from '../../../schemas/auth'
import * as authService from './service'
import { AuthServiceError } from './service'
import type { AuthServiceErrorKind, LoginResult, LogoutResult, SendOtpResult } from './type'

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

const statusByKind: Record<AuthServiceErrorKind, AuthControllerError['status']> = {
  INVALID_CODE: 401,
  INVALID_PASSWORD: 401,
  MAIL_ERROR: 502,
  TOKEN_ERROR: 500,
  DB_ERROR: 500,
}

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new AuthControllerError('Invalid request', 400, z.flattenError(parsed.error).fieldErrors)
  }
  return parsed.data
}

async function fromService<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof AuthServiceError)) throw err
    throw new AuthControllerError(err.message, statusByKind[err.kind])
  }
}

export async function sendOtp(body: unknown): Promise<SendOtpResult> {
  const input = parse(sendOtpRequestSchema, body)
  return fromService(() => authService.sendOtp(input))
}

export async function login(body: unknown): Promise<LoginResult> {
  const input = parse(loginRequestSchema, body)
  return fromService(() => authService.login(input))
}

// Stops at the controller: clears the auth cookie, no service or db involved.
export function logout(c: Context): LogoutResult {
  const { name, secure, sameSite } = config.cookie
  deleteCookie(c, name, { httpOnly: true, secure, sameSite, path: '/' })
  return { loggedOut: true }
}
