// auth: db queries on the BHANDAR_DB D1 binding; tables are created by migrations/
// replaceOtp(): Deletes the user's earlier codes and saves the new one in one batch, so only the latest code works.
// recordFailedAttempt(): Login gets only a code, so a wrong one can't be matched to the code it was meant for. Since a
//   user has at most one code, every live code takes the attempt, and those reaching maxAttempts are deleted.
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

export function replaceOtp(otp: NewOtp): Promise<void> {
  return query('Failed to save OTP', async () => {
    await env.BHANDAR_DB.batch([
      env.BHANDAR_DB.prepare('DELETE FROM otp WHERE user_id = ?').bind(otp.user_id),
      env.BHANDAR_DB.prepare('INSERT INTO otp (user_id, code_hash, expires_at) VALUES (?, ?, ?)').bind(
        otp.user_id,
        otp.code_hash,
        otp.expires_at,
      ),
    ])
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

export function recordFailedAttempt(now: string, maxAttempts: number): Promise<void> {
  return query('Failed to record OTP attempt', async () => {
    await env.BHANDAR_DB.batch([
      env.BHANDAR_DB.prepare('UPDATE otp SET attempts = attempts + 1 WHERE expires_at > ?').bind(now),
      env.BHANDAR_DB.prepare('DELETE FROM otp WHERE attempts >= ?').bind(maxAttempts),
    ])
  })
}

export function deleteOtp(id: number): Promise<boolean> {
  return query('Failed to delete OTP', async () => {
    const { meta } = await env.BHANDAR_DB.prepare('DELETE FROM otp WHERE id = ?').bind(id).run()
    return meta.changes > 0
  })
}
