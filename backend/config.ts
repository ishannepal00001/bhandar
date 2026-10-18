// Every tunable value lives here. Machine-specific and secret ones come from .env.
const env = process.env

export const config = {
  db: {
    dataDir: env.DATA_DIR ?? './data',
    fileName: 'bhandar.db',
  },
  otp: {
    length: 6,
    ttlMinutes: 10,
  },
  password: {
    minLength: 8,
  },
  mail: {
    host: env.SMTP_HOST,
    port: Number(env.SMTP_PORT ?? 465),
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
    from: env.MAIL_FROM,
    otpSubject: 'Your Bhandar login code',
  },
  seed: {
    name: 'Santosh',
    email: env.SEED_EMAIL,
    password: env.SEED_PASSWORD,
  },
}
