// auth: types
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
