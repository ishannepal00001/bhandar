// Seeds the user named by SEED_NAME / SEED_EMAIL (wrangler.jsonc vars) with SEED_PASSWORD (.dev.vars) into D1.
// Run with: bun run seed:local (or seed:remote); scripts/workers-env.ts provides `cloudflare:workers`.
import { env } from 'cloudflare:workers'
import { createSendOtpRequestSchema } from '../../schemas/auth'
import { hashPassword } from '../src/modules/auth/utils'

// SEED_PASSWORD is a local-only secret, so it isn't in secrets.required or the generated Env.
const { SEED_NAME: name, SEED_EMAIL: email, SEED_PASSWORD: password } = env as Env & { SEED_PASSWORD?: string }

const target = process.argv[2]
if (target !== '--local' && target !== '--remote') {
  console.error('Usage: bun run seed:local | seed:remote')
  process.exit(1)
}

const parsed = createSendOtpRequestSchema(env.PASSWORD_MIN_LENGTH).safeParse({ password })

if (!email || !parsed.success) {
  console.error('Set SEED_EMAIL in wrangler.jsonc vars and a SEED_PASSWORD in .dev.vars that matches the password rules.')
  if (!parsed.success) console.error(parsed.error.issues.map((issue) => `  ${issue.message}`).join('\n'))
  process.exit(1)
}

const { hash, salt } = await hashPassword(parsed.data.password)
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
const sql =
  `INSERT INTO users (name, email, password, password_salt) VALUES (${quote(name)}, ${quote(email)}, ${quote(hash)}, ${quote(salt)}) ` +
  'ON CONFLICT(name) DO UPDATE SET email = excluded.email, password = excluded.password, password_salt = excluded.password_salt'

// wrangler d1 accepts the binding name, so the database name stays only in wrangler.jsonc.
const proc = Bun.spawn(['bunx', 'wrangler', 'd1', 'execute', 'BHANDAR_DB', target, '--command', sql], {
  stdout: 'inherit',
  stderr: 'inherit',
})
if ((await proc.exited) !== 0) process.exit(1)
console.log(`Seeded user ${name} <${email}> (${target.slice(2)})`)
