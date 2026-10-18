// Lets a request through only with a valid auth cookie; sets c.var.user for the handler.
import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { config } from '../../../config'
import { AuthUtilsError, type TokenUser, verifyToken } from '../../modules/auth/utils'

export class IsUserError extends Error {
  constructor(
    message: string,
    readonly status: 401 | 500,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'IsUserError'
  }
}

export type IsUserEnv = {
  Variables: {
    user: TokenUser
  }
}

export const isUser = createMiddleware<IsUserEnv>(async (c, next) => {
  const token = getCookie(c, config.cookie.name)
  if (!token) throw new IsUserError('Not logged in', 401)

  let user: TokenUser | undefined
  try {
    user = await verifyToken(token)
  } catch (err) {
    if (!(err instanceof AuthUtilsError)) throw err
    throw new IsUserError(err.message, 500, { cause: err })
  }
  if (!user) throw new IsUserError('Invalid or expired session', 401)

  c.set('user', user)
  await next()
})
