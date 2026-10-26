// auth: db queries on the BHANDAR_DB D1 binding; tables are created by migrations/
// deleteOtp(): Returns false when the OTP was already gone, e.g. used by a concurrent login.
import { env } from 'cloudflare:workers'
import type { NewOtp, Otp, User } from './model.types'
import { AuthModelError } from './model.error'

async function query<T>(message: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    throw new AuthModelError(message, { cause: err })
  }
}

export function listUsers(): Promise<User[]> {
  return query('Failed to list users', async () => {
    const { results } = await env.BHANDAR_DB.prepare('SELECT * FROM users').all<User>()
    return results
  })
}

export function findUserById(id: number): Promise<User | undefined> {
  return query('Failed to look up user', async () => {
    const user = await env.BHANDAR_DB.prepare('SELECT * FROM users WHERE id = ?').bind(id).first<User>()
    return user ?? undefined
  })
}

export function createOtp(otp: NewOtp): Promise<void> {
  return query('Failed to save OTP', async () => {
    await env.BHANDAR_DB.prepare('INSERT INTO otp (user_id, code_hash, expires_at) VALUES (?, ?, ?)')
      .bind(otp.user_id, otp.code_hash, otp.expires_at)
      .run()
  })
}

export function findValidOtp(codeHash: string, now: string): Promise<Otp | undefined> {
  return query('Failed to look up OTP', async () => {
    const otp = await env.BHANDAR_DB.prepare('SELECT * FROM otp WHERE code_hash = ? AND expires_at > ?')
      .bind(codeHash, now)
      .first<Otp>()
    return otp ?? undefined
  })
}

export function deleteOtp(id: number): Promise<boolean> {
  return query('Failed to delete OTP', async () => {
    const { meta } = await env.BHANDAR_DB.prepare('DELETE FROM otp WHERE id = ?').bind(id).run()
    return meta.changes > 0
  })
}
