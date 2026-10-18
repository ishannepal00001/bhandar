import { z } from 'zod'

const schema = z.object({
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default('127.0.0.1'),
  DATA_DIR: z.string().default('./data'),
  MAX_CONCURRENT: z.coerce.number().int().positive().default(2),
  B2_KEY_ID: z.string().min(1, 'B2_KEY_ID is required'),
  B2_APP_KEY: z.string().min(1, 'B2_APP_KEY is required'),
  B2_BUCKET: z.string().min(1, 'B2_BUCKET is required'),
  B2_ENDPOINT: z.url('B2_ENDPOINT must be a URL'),
  B2_REGION: z.string().min(1, 'B2_REGION is required'),
})

const parsed = schema.safeParse(process.env)

if (!parsed.success) {
  console.error('Invalid environment. Copy .env.example to .env and fill it in:')
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`)
  }
  process.exit(1)
}

export const env = parsed.data
