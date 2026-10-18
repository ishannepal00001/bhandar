// auth: types
export type LoginResult = {
  authenticated: true
}

export type SendOtpResult = {
  sent: true
}

export type AuthServiceErrorKind = 'INVALID_CODE' | 'INVALID_PASSWORD' | 'MAIL_ERROR' | 'DB_ERROR'
