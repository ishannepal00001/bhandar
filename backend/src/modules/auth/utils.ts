// auth: helpers
// sha256Hex(): SHA-256 with Web Crypto, which Workers and Bun both provide.
// PASSWORD_SCHEME: The prefix of a stored password, "pbkdf2_sha256$<iterations>$<hex>". The iteration count is stored with
//   the hash, so changing PASSWORD_HASH_ITERATIONS doesn't break a password hashed under the old count.
// pbkdf2Hex(): PBKDF2-HMAC-SHA256 with Web Crypto; the salt is the hex in users.password_salt, decoded to bytes. Workers
//   caps iterations at 100000, and on Workers Free the whole request has about 10ms of CPU, which is why
//   PASSWORD_HASH_ITERATIONS is lower.
// hashPassword(): A random PASSWORD_SALT_BYTES salt and the hash in PASSWORD_SCHEME form.
// verifyPassword(): False for a stored value that isn't in PASSWORD_SCHEME form. Compares in constant time.
// hashCode(): Unsalted so a code can be looked up by its hash; codes are single use and short-lived.
// verifyToken(): Returns undefined for a bad, tampered or expired token; throws only when the secret is missing.
// sendOtpMail(): On port 465 it opens the TLS socket itself by hostname. Nodemailer would resolve the host to an IP
//   first, and Workers checks the certificate against the address it connects to, so Gmail's cert fails on its IP.
import { randomInt } from 'node:crypto'
import tls from 'node:tls'
import { sign, verify } from 'hono/jwt'
import nodemailer from 'nodemailer'
import { env } from 'cloudflare:workers'
import { AuthUtilsError } from './utils.error'
import type { TokenUser } from './utils.types'

const PASSWORD_SCHEME = 'pbkdf2_sha256'

export function generateOtp(): string {
  const length = env.OTP_LENGTH
  return randomInt(0, 10 ** length).toString().padStart(length, '0')
}

export async function sendOtpMail(to: string, code: string): Promise<void> {
  const { SMTP_HOST: host, SMTP_PORT: port, SMTP_USER: user, SMTP_PASS: pass, MAIL_FROM: from } = env
  if (!host || !user || !pass || !from) throw new AuthUtilsError('Mail is not configured')

  const secure = port === 465
  const transport = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    getSocket: secure
      ? (_options, callback) => {
          const onError = (err: Error) => callback(err)
          const socket = tls.connect({ host, port, servername: host }, () => {
            socket.off('error', onError)
            callback(null, { connection: socket, secured: true })
          })
          socket.once('error', onError)
        }
      : undefined,
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

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array((hex.match(/../g) ?? []).map((byte) => parseInt(byte, 16)))
}

async function pbkdf2Hex(password: string, salt: string, iterations: number): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: hexToBytes(salt), iterations },
    key,
    256,
  )
  return bytesToHex(bits)
}

export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(env.PASSWORD_SALT_BYTES)).buffer)
  const iterations = env.PASSWORD_HASH_ITERATIONS
  return { hash: `${PASSWORD_SCHEME}$${iterations}$${await pbkdf2Hex(password, salt, iterations)}`, salt }
}

export async function verifyPassword(password: string, salt: string, stored: string): Promise<boolean> {
  const [scheme, rounds, expected] = stored.split('$')
  const iterations = Number(rounds)
  if (scheme !== PASSWORD_SCHEME || !Number.isInteger(iterations) || iterations <= 0 || !expected) return false

  const actual = new TextEncoder().encode(await pbkdf2Hex(password, salt, iterations))
  const wanted = new TextEncoder().encode(expected)
  return actual.byteLength === wanted.byteLength && crypto.subtle.timingSafeEqual(actual, wanted)
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
