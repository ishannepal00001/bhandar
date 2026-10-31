export type SendOtpRequest = { password: string }

export type SendOtpResult = { sent: true }

export type LoginRequest = { code: string }

export type LoginResult = { token: string }

export type LogoutResult = { loggedOut: true }
