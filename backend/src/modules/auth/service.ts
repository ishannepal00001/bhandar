// auth: business logic
import { config } from '../../../config'
import type { LoginRequest, SendOtpRequest } from '../../../schemas/auth'
import * as authModel from './model'
import { AuthModelError } from './model'
import type { AuthServiceErrorKind, LoginResult, SendOtpResult } from './type'
import { AuthUtilsError, generateOtp, sendOtpMail } from './utils'

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

async function fromModel<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof AuthModelError)) throw err
    throw new AuthServiceError(err.message, 'DB_ERROR', { cause: err })
  }
}

export async function sendOtp(input: SendOtpRequest): Promise<SendOtpResult> {
  const users = await fromModel(() => authModel.listUsers())

  let user: authModel.User | undefined
  for (const candidate of users) {
    if (await Bun.password.verify(input.password, candidate.password)) {
      user = candidate
      break
    }
  }
  if (!user) throw new AuthServiceError('Invalid password', 'INVALID_PASSWORD')

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + config.otp.ttlMinutes * 60_000).toISOString()
  await fromModel(() => authModel.createOtp({ user_id: user.id, code, expires_at: expiresAt }))

  try {
    await sendOtpMail(user.email, code)
  } catch (err) {
    if (!(err instanceof AuthUtilsError)) throw err
    throw new AuthServiceError(err.message, 'MAIL_ERROR', { cause: err })
  }

  return { sent: true }
}

export async function login(input: LoginRequest): Promise<LoginResult> {
  const otp = await fromModel(() => authModel.findValidOtp(input.code, new Date().toISOString()))
  if (!otp) throw new AuthServiceError('Invalid code', 'INVALID_CODE')
  return { authenticated: true }
}
