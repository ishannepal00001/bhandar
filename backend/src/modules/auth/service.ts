// auth: business logic
import { config } from '../../../config'
import type { LoginRequest, SendOtpRequest } from '../../../../schemas/auth'
import * as authModel from './model'
import { AuthModelError } from './model'
import type { AuthServiceErrorKind, LoginResult, SendOtpResult } from './type'
import { AuthUtilsError, generateOtp, hashSecret, sendOtpMail, signToken, verifySecret } from './utils'

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
    if (await verifySecret(input.password, candidate.password)) {
      user = candidate
      break
    }
  }
  if (!user) throw new AuthServiceError('Invalid password', 'INVALID_PASSWORD')

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + config.otp.ttlMinutes * 60_000).toISOString()
  const codeHash = await hashSecret(code)
  await fromModel(() => authModel.createOtp({ user_id: user.id, code: codeHash, expires_at: expiresAt }))

  try {
    await sendOtpMail(user.email, code)
  } catch (err) {
    if (!(err instanceof AuthUtilsError)) throw err
    throw new AuthServiceError(err.message, 'MAIL_ERROR', { cause: err })
  }

  return { sent: true }
}

export async function login(input: LoginRequest): Promise<LoginResult> {
  const otps = await fromModel(() => authModel.listValidOtps(new Date().toISOString()))

  let otp: authModel.Otp | undefined
  for (const candidate of otps) {
    if (await verifySecret(input.code, candidate.code)) {
      otp = candidate
      break
    }
  }
  if (!otp) throw new AuthServiceError('Invalid code', 'INVALID_CODE')

  const user = await fromModel(() => authModel.findUserById(otp.user_id))
  if (!user) throw new AuthServiceError('Invalid code', 'INVALID_CODE')

  let token: string
  try {
    token = await signToken(user.id, user.name)
  } catch (err) {
    if (!(err instanceof AuthUtilsError)) throw err
    throw new AuthServiceError(err.message, 'TOKEN_ERROR', { cause: err })
  }

  // Delete last so a failed login doesn't use up the code.
  const deleted = await fromModel(() => authModel.deleteOtp(otp.id))
  if (!deleted) throw new AuthServiceError('Invalid code', 'INVALID_CODE')
  return { token }
}
