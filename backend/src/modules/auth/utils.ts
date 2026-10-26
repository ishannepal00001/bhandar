// auth: helpers
// sha256Hex(): SHA-256 with Web Crypto, which Workers and Bun both provide.
// hashPassword(): SHA-256(salt + password) with a random salt.
// hashCode(): Unsalted so a code can be looked up by its hash; codes are single use and short-lived.
// verifyToken(): Returns undefined for a bad, tampered or expired token; throws only when the secret is missing.
import { randomInt } from 'node:crypto'
import { sign, verify } from 'hono/jwt'
import nodemailer from 'nodemailer'
import { env } from 'cloudflare:workers'
import { AuthUtilsError } from './utils.error'
import type { TokenUser } from './utils.types'

export function generateOtp(): string {
  const length = env.OTP_LENGTH
  return randomInt(0, 10 ** length).toString().padStart(length, '0')
}

export async function sendOtpMail(to: string, code: string): Promise<void> {
  const { SMTP_HOST: host, SMTP_PORT: port, SMTP_USER: user, SMTP_PASS: pass, MAIL_FROM: from } = env
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
      subject: env.OTP_MAIL_SUBJECT,
      text: `Your login code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.`,
    })
  } catch (err) {
    throw new AuthUtilsError('Failed to send OTP mail', { cause: err })
  }
}

function bytesToHex(bytes: ArrayBuffer): string {
  return [...new Uint8Array(bytes)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(input: string): Promise<string> {
  return bytesToHex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input)))
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(env.PASSWORD_SALT_BYTES)).buffer)
  return { hash: await sha256Hex(`${salt}:${password}`), salt }
}

export async function verifyPassword(password: string, salt: string, expectedHash: string): Promise<boolean> {
  return (await sha256Hex(`${salt}:${password}`)) === expectedHash
}

export function hashCode(code: string): Promise<string> {
  return sha256Hex(code)
}

export function tokenTtlSeconds(): number {
  return env.JWT_TTL_DAYS * 24 * 60 * 60
}

export async function signToken(userId: number, name: string): Promise<string> {
  const { JWT_SECRET: secret, JWT_ALGORITHM: algorithm } = env
  if (!secret) throw new AuthUtilsError('JWT secret is not configured')

  const now = Math.floor(Date.now() / 1000)
  try {
    return await sign({ sub: String(userId), name, iat: now, exp: now + tokenTtlSeconds() }, secret, algorithm)
  } catch (err) {
    throw new AuthUtilsError('Failed to sign token', { cause: err })
  }
}

export async function verifyToken(token: string): Promise<TokenUser | undefined> {
  const { JWT_SECRET: secret, JWT_ALGORITHM: algorithm } = env
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
