// auth: types
// User: Rows of the users and otp tables (migrations/0001_init.sql).
// User.password: SHA-256 of "<salt>:<password>", never the plain password.
// Otp.code_hash: SHA-256 of the code, never the plain code.
export type LoginResult = {
  token: string
}

export type LogoutResult = {
  loggedOut: true
}

export type SendOtpResult = {
  sent: true
}

export type AuthServiceErrorKind = 'INVALID_CODE' | 'INVALID_PASSWORD' | 'MAIL_ERROR' | 'TOKEN_ERROR' | 'DB_ERROR'

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
  created_at: string
}

export type NewOtp = Pick<Otp, 'user_id' | 'code_hash' | 'expires_at'>
