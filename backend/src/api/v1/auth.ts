// /api/v1/auth: accepts requests, returns JSON
import { env } from 'cloudflare:workers'
import { Hono } from 'hono'
import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import * as authController from '../../modules/auth/controller'
import { AuthControllerError } from '../../modules/auth/controller.error'
import { tokenTtlSeconds } from '../../modules/auth/utils'
import { rateLimit } from '../../core/middlewares/rateLimit'
import { AuthRouteError } from './auth.error'

async function readJson(c: Context): Promise<unknown> {
  return c.req.json().catch(() => {
    throw new AuthRouteError('Body must be valid JSON', 400)
  })
}

async function fromController<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof AuthControllerError)) throw err
    throw new AuthRouteError(err.message, err.status, err.issues)
  }
}

export const authRouter = new Hono()

authRouter.post('/send-otp', rateLimit((env) => env.SEND_OTP_LIMITER), async (c) => {
  const body = await readJson(c)
  return c.json(await fromController(() => authController.sendOtp(body)))
})

authRouter.post('/login', rateLimit((env) => env.LOGIN_LIMITER), async (c) => {
  const body = await readJson(c)
  const result = await fromController(() => authController.login(body))

  const { COOKIE_NAME: name, COOKIE_SECURE: secure, COOKIE_SAME_SITE: sameSite } = env
  setCookie(c, name, result.token, { httpOnly: true, secure, sameSite, path: '/', maxAge: tokenTtlSeconds() })
  return c.json(result)
})

authRouter.post('/logout', (c) => c.json(authController.logout(c)))
