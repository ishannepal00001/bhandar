// auth: helpers
import { randomInt } from 'node:crypto'
import { sign, verify } from 'hono/jwt'
import nodemailer from 'nodemailer'
import { config } from '../../../config'

export class AuthUtilsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AuthUtilsError'
  }
}

export function generateOtp(): string {
  const { length } = config.otp
  return randomInt(0, 10 ** length).toString().padStart(length, '0')
}

export async function sendOtpMail(to: string, code: string): Promise<void> {
  const { host, port, user, pass, from, otpSubject } = config.mail
  if (!host || !user || !pass || !from) throw new AuthUtilsError('Mail is not configured')

  const transport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  try {
    await transport.sendMail({
      from,
      to,
      subject: otpSubject,
      text: `Your login code is ${code}. It expires in ${config.otp.ttlMinutes} minutes.`,
    })
  } catch (err) {
    throw new AuthUtilsError('Failed to send OTP mail', { cause: err })
  }
}

// bcrypt hashing for passwords and OTPs.
export function hashSecret(secret: string): Promise<string> {
  return Bun.password.hash(secret, { algorithm: 'bcrypt', cost: config.bcrypt.cost })
}

// A hash that isn't bcrypt (e.g. stored before the switch) counts as a mismatch.
export async function verifySecret(secret: string, hash: string): Promise<boolean> {
  try {
    return await Bun.password.verify(secret, hash, 'bcrypt')
  } catch {
    return false
  }
}

export function tokenTtlSeconds(): number {
  return config.jwt.ttlDays * 24 * 60 * 60
}

export async function signToken(userId: number, name: string): Promise<string> {
  const { secret, algorithm } = config.jwt
  if (!secret) throw new AuthUtilsError('JWT secret is not configured')

  const now = Math.floor(Date.now() / 1000)
  try {
    return await sign({ sub: String(userId), name, iat: now, exp: now + tokenTtlSeconds() }, secret, algorithm)
  } catch (err) {
    throw new AuthUtilsError('Failed to sign token', { cause: err })
  }
}

export type TokenUser = {
  id: number
  name: string
}

// Returns undefined for a bad, tampered or expired token; throws only when the secret is missing.
export async function verifyToken(token: string): Promise<TokenUser | undefined> {
  const { secret, algorithm } = config.jwt
  if (!secret) throw new AuthUtilsError('JWT secret is not configured')

  try {
    const payload = await verify(token, secret, algorithm)
    const id = Number(payload.sub)
    if (!Number.isInteger(id) || typeof payload.name !== 'string') return undefined
    return { id, name: payload.name }
  } catch {
    return undefined
  }
}
