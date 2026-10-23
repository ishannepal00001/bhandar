// Seeds the user named in config.seed into D1. Set SEED_EMAIL and SEED_PASSWORD in .env, then: bun run seed:local (or seed:remote)
import { config } from '../config'
import { sendOtpRequestSchema } from '../../schemas/auth'
import { hashPassword } from '../src/modules/auth/utils'

const target = process.argv[2]
if (target !== '--local' && target !== '--remote') {
  console.error('Usage: bun scripts/seed.ts --local|--remote')
  process.exit(1)
}

const { name, email } = config.seed
const parsed = sendOtpRequestSchema.safeParse({ password: config.seed.password })

if (!email || !parsed.success) {
  console.error('Set SEED_EMAIL and a SEED_PASSWORD that matches the password rules.')
  if (!parsed.success) console.error(parsed.error.issues.map((issue) => `  ${issue.message}`).join('\n'))
  process.exit(1)
}

const { hash, salt } = await hashPassword(parsed.data.password)
const quote = (value: string) => `'${value.replaceAll("'", "''")}'`
const sql =
  `INSERT INTO users (name, email, password, password_salt) VALUES (${quote(name)}, ${quote(email)}, ${quote(hash)}, ${quote(salt)}) ` +
  'ON CONFLICT(name) DO UPDATE SET email = excluded.email, password = excluded.password, password_salt = excluded.password_salt'

const proc = Bun.spawn(['bunx', 'wrangler', 'd1', 'execute', config.db.name, target, '--command', sql], {
  stdout: 'inherit',
  stderr: 'inherit',
})
if ((await proc.exited) !== 0) process.exit(1)
console.log(`Seeded user ${name} <${email}> (${target.slice(2)})`)
