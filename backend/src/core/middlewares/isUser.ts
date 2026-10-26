// Lets a request through only with a valid auth cookie; sets c.var.user for the handler.
import { env } from 'cloudflare:workers'
import { getCookie } from 'hono/cookie'
import { createMiddleware } from 'hono/factory'
import { verifyToken } from '../../modules/auth/utils'
import type { TokenUser } from '../../modules/auth/utils.types'
import { AuthUtilsError } from '../../modules/auth/utils.error'
import type { IsUserEnv } from './isUser.types'
import { IsUserError } from './isUser.error'

export const isUser = createMiddleware<IsUserEnv>(async (c, next) => {
  const token = getCookie(c, env.COOKIE_NAME)
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
