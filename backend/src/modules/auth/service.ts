// auth: business logic
// sendOtp(): A new code replaces any earlier one, so at most one code per user is ever valid.
// login(): A wrong code counts against the live code, which is deleted after OTP_MAX_ATTEMPTS, so a new one needs the
//   password again. A right code is deleted last, so a login that fails after the lookup doesn't use it up.
import { env } from 'cloudflare:workers'
import type { LoginRequest, SendOtpRequest } from '../../../../schemas/auth'
import * as authModel from './model'
import { AuthModelError } from './model.error'
import type { User } from './model.types'
import type { LoginResult, SendOtpResult } from './service.types'
import { generateOtp, hashCode, sendOtpMail, signToken, verifyPassword } from './utils'
import { AuthUtilsError } from './utils.error'
import { AuthServiceError } from './service.error'

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

  let user: User | undefined
  for (const candidate of users) {
    if (await verifyPassword(input.password, candidate.password_salt, candidate.password)) {
      user = candidate
      break
    }
  }
  if (!user) throw new AuthServiceError('Invalid password', 'INVALID_PASSWORD')

  const code = generateOtp()
  const expiresAt = new Date(Date.now() + env.OTP_TTL_MINUTES * 60_000).toISOString()
  const codeHash = await hashCode(code)
  await fromModel(() => authModel.replaceOtp({ user_id: user.id, code_hash: codeHash, expires_at: expiresAt }))

  try {
    await sendOtpMail(user.email, code)
  } catch (err) {
    if (!(err instanceof AuthUtilsError)) throw err
    throw new AuthServiceError(err.message, 'MAIL_ERROR', { cause: err })
  }

  return { sent: true }
}

export async function login(input: LoginRequest): Promise<LoginResult> {
  const codeHash = await hashCode(input.code)
  const now = new Date().toISOString()
  const otp = await fromModel(() => authModel.findValidOtp(codeHash, now))
  if (!otp) {
    await fromModel(() => authModel.recordFailedAttempt(now, env.OTP_MAX_ATTEMPTS))
    throw new AuthServiceError('Invalid code', 'INVALID_CODE')
  }

  const user = await fromModel(() => authModel.findUserById(otp.user_id))
  if (!user) throw new AuthServiceError('Invalid code', 'INVALID_CODE')

  let token: string
  try {
    token = await signToken(user.id, user.name)
  } catch (err) {
    if (!(err instanceof AuthUtilsError)) throw err
    throw new AuthServiceError(err.message, 'TOKEN_ERROR', { cause: err })
  }

  const deleted = await fromModel(() => authModel.deleteOtp(otp.id))
  if (!deleted) throw new AuthServiceError('Invalid code', 'INVALID_CODE')
  return { token }
}
