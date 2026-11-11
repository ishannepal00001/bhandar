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
//   It takes every recipient, so one login code can go to the owner and anyone else who needs it (OTP_RECIPIENTS).
//   The code leads the subject, so phones and Gmail show it (and offer their own copy button) in the notification.
// otpMailHtml(): The app's look in what mail clients render: tables, inline styles, its three colours, square corners
//   and fonts that fall back to Georgia and the system monospace. Mail clients run no script, so the code can't be
//   copied by a button; instead the code selects whole on one tap (user-select: all), and the button opens
//   <frontend>/auth#code=<code>, which fills the code in. The code rides in the fragment, which browsers never send to
//   a server. With no frontend the button is left out.
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

export async function sendOtpMail(to: string[], code: string, frontend: string | null): Promise<void> {
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
      subject: `${code} · ${env.OTP_MAIL_SUBJECT}`,
      text:
        `Your login code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.` +
        (frontend ? `\n\nSign in with it: ${signInUrl(frontend, code)}` : ''),
      html: otpMailHtml(code, frontend),
    })
  } catch (err) {
    throw new AuthUtilsError('Failed to send OTP mail', { cause: err })
  }
}

function signInUrl(frontend: string, code: string): string {
  return `${frontend}/auth#code=${code}`
}

function otpMailHtml(code: string, frontend: string | null): string {
  const navy = '#0B2350'
  const gold = '#B08A3C'
  const cream = '#F3EFE6'
  const muted = '#5C6B85'
  const serif = "Fraunces, Georgia, 'Times New Roman', serif"
  const sans = "'IBM Plex Sans', -apple-system, 'Segoe UI', Roboto, Arial, sans-serif"
  const mono = "'IBM Plex Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace"

  const button = frontend
    ? `<tr><td style="padding:0 32px 8px">
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
          <td align="center" bgcolor="${navy}" style="background:${navy}">
            <a href="${signInUrl(frontend, code)}" style="display:block;padding:14px 24px;font-family:${sans};font-size:15px;font-weight:600;color:${cream};text-decoration:none">Sign in with this code &rarr;</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:0 32px 28px;font-family:${sans};font-size:12px;line-height:18px;color:${muted};text-align:center">Opens Bhandar with the code filled in.</td></tr>`
    : ''

  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><title>Your Bhandar login code</title></head>
<body style="margin:0;padding:0;background:${cream}">
<div style="display:none;max-height:0;overflow:hidden">Your login code is ${code}. It expires in ${env.OTP_TTL_MINUTES} minutes.</div>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" bgcolor="${cream}" style="background:${cream}"><tr><td align="center" style="padding:40px 16px">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="max-width:440px;background:${cream};border:1px solid #D9D5CF;border-top:3px solid ${gold}">
    <tr><td style="padding:32px 32px 0">
      <table role="presentation" cellpadding="0" cellspacing="0"><tr>
        <td width="36" height="36" align="center" bgcolor="${navy}" style="background:${navy};font-family:${sans};font-size:20px;font-weight:700;line-height:36px;color:#D4AF5F">&darr;</td>
        <td style="padding-left:12px;font-family:${serif};font-size:22px;font-weight:600;color:${navy}">Bhandar</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:28px 32px 0;font-family:${mono};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${gold}">Login code</td></tr>
    <tr><td style="padding:8px 32px 0;font-family:${serif};font-size:26px;line-height:32px;color:${navy}">Here's your code</td></tr>
    <tr><td style="padding:8px 32px 24px;font-family:${sans};font-size:14px;line-height:21px;color:${muted}">Enter it on the sign-in page to finish logging in. It works once and expires in ${env.OTP_TTL_MINUTES} minutes.</td></tr>
    <tr><td style="padding:0 32px 24px">
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%"><tr>
        <td align="center" style="padding:18px 8px 18px 18px;border:1px solid ${navy};font-family:${mono};font-size:34px;font-weight:500;letter-spacing:10px;color:${navy};-webkit-user-select:all;user-select:all">${code}</td>
      </tr></table>
      <p style="margin:8px 0 0;font-family:${sans};font-size:12px;color:${muted};text-align:center">Tap the code once to select all of it.</p>
    </td></tr>
    ${button}
    <tr><td style="padding:16px 32px 24px;border-top:1px solid #D9D5CF;font-family:${sans};font-size:12px;line-height:18px;color:${muted}">Didn't try to sign in? Someone may know your password. Don't share this code; it expires on its own.</td></tr>
  </table>
</td></tr></table>
</body></html>`
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
