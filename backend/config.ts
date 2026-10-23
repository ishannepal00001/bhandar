// Every tunable value lives here. On Workers, process.env holds the vars and secrets from wrangler.jsonc;
// the seed script runs under Bun and reads backend/.env.
const env = process.env

export const config = {
  db: {
    name: 'bhandardb',
  },
  otp: {
    length: 6,
    ttlMinutes: Number(env.OTP_TTL_MINUTES ?? 10),
  },
  password: {
    minLength: 8,
    saltBytes: 16,
  },
  jwt: {
    secret: env.JWT_SECRET,
    algorithm: 'HS256' as const,
    ttlDays: Number(env.JWT_TTL_DAYS ?? 7),
  },
  cookie: {
    name: env.COOKIE_NAME ?? 'bhandar_token',
    secure: env.COOKIE_SECURE === 'true',
    sameSite: 'Strict' as const,
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
