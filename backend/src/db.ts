// Kysely instance shared by every module's model.ts; tables are created by migrations/
import { env } from 'cloudflare:workers'
import { Kysely } from 'kysely'
import { D1Dialect } from 'kysely-d1'
import type { OtpTable, UsersTable } from './modules/auth/model'

export interface Database {
  users: UsersTable
  otp: OtpTable
}

export const db = new Kysely<Database>({
  dialect: new D1Dialect({ database: env.BHANDAR_DB }),
})
