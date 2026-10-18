// Kysely instance shared by every module's model.ts
import { Database as Sqlite } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { Kysely, sql } from 'kysely'
import { BunSqliteDialect } from 'kysely-bun-sqlite'
import type { LoginCodesTable } from './modules/auth/model'

export interface Database {
  login_codes: LoginCodesTable
}

const dataDir = process.env.DATA_DIR ?? './data'
mkdirSync(dataDir, { recursive: true })

const sqlite = new Sqlite(join(dataDir, 'bhandar.db'), { create: true, strict: true })
sqlite.run('PRAGMA journal_mode = WAL')

export const db = new Kysely<Database>({
  dialect: new BunSqliteDialect({ database: sqlite }),
})

export async function migrate() {
  await db.schema
    .createTable('login_codes')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.primaryKey().autoIncrement())
    .addColumn('code', 'text', (col) => col.notNull().unique())
    .addColumn('created_at', 'text', (col) => col.notNull().defaultTo(sql`CURRENT_TIMESTAMP`))
    .execute()
}
