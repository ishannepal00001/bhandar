// Kysely instance shared by every module's model.ts
import { Database as Sqlite } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Kysely, sql } from 'kysely'
import { BunSqliteDialect } from 'kysely-bun-sqlite'
import { config } from '../config'
import type { OtpTable, UsersTable } from './modules/auth/model'

export interface Database {
  users: UsersTable
  otp: OtpTable
}

mkdirSync(config.db.dataDir, { recursive: true })

const sqlite = new Sqlite(join(config.db.dataDir, config.db.fileName), { create: true, strict: true })
sqlite.run('PRAGMA journal_mode = WAL')
sqlite.run('PRAGMA foreign_keys = ON')

export const db = new Kysely<Database>({
  dialect: new BunSqliteDialect({ database: sqlite }),
})

export async function migrate() {
  await db.schema
    .createTable('users')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('name', 'text', (col) => col.notNull().unique())
    .addColumn('email', 'text', (col) => col.notNull())
    .addColumn('password', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()

  await db.schema
    .createTable('otp')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('user_id', 'integer', (col) => col.notNull().references('users.id').onDelete('cascade'))
    .addColumn('code', 'text', (col) => col.notNull())
    .addColumn('expires_at', 'text', (col) => col.notNull())
    .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()
}
