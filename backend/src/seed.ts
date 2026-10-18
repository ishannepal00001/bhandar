// Seeds the user named in config.seed. Set SEED_EMAIL and SEED_PASSWORD in .env, then: bun run seed
import { config } from '../config'
import { sendOtpRequestSchema } from '../schemas/auth'
import { migrate } from './db'
import { upsertUser } from './modules/auth/model'

const { name, email } = config.seed
const parsed = sendOtpRequestSchema.safeParse({ password: config.seed.password })

if (!email || !parsed.success) {
  console.error('Set SEED_EMAIL and a SEED_PASSWORD that matches the password rules.')
  if (!parsed.success) console.error(parsed.error.issues.map((issue) => `  ${issue.message}`).join('\n'))
  process.exit(1)
}

await migrate()
await upsertUser({
  name,
  email,
  password: await Bun.password.hash(parsed.data.password),
})
console.log(`Seeded user ${name} <${email}>`)
