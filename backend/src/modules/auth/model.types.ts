// auth: types for the model
// User: Rows of the users and otp tables (migrations/0001_init.sql).
// User.password: "pbkdf2_sha256$<iterations>$<hex>" (see hashPassword in utils.ts), never the plain password.
// Otp.code_hash: SHA-256 of the code, never the plain code.
// Otp.attempts: Wrong codes entered while this code was live; it's deleted at OTP_MAX_ATTEMPTS.
export type User = {
  id: number
  name: string
  email: string
  password: string
  password_salt: string
  created_at: string
}

export type Otp = {
  id: number
  user_id: number
  code_hash: string
  expires_at: string
  attempts: number
  created_at: string
}

export type NewOtp = Pick<Otp, 'user_id' | 'code_hash' | 'expires_at'>
