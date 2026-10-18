// auth: db tables and queries
import type { Generated, Selectable } from 'kysely'
import { db } from '../../db'

export class AuthModelError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'AuthModelError'
  }
}

export interface LoginCodesTable {
  id: Generated<number>
  code: string
  created_at: Generated<string>
}

export type LoginCode = Selectable<LoginCodesTable>

export async function findLoginCode(code: string): Promise<LoginCode | undefined> {
  try {
    return await db.selectFrom('login_codes').selectAll().where('code', '=', code).executeTakeFirst()
  } catch (err) {
    throw new AuthModelError('Failed to look up login code', { cause: err })
  }
}
