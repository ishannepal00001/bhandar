// /api/v1/auth: accepts requests, returns JSON
import { Hono } from 'hono'
import type { Context } from 'hono'
import { setCookie } from 'hono/cookie'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { config } from '../../../config'
import * as authController from '../../modules/auth/controller'
import { AuthControllerError } from '../../modules/auth/controller'
import { tokenTtlSeconds } from '../../modules/auth/utils'

export class AuthRouteError extends Error {
  constructor(
    message: string,
    readonly status: ContentfulStatusCode,
    readonly issues?: Partial<Record<string, string[]>>,
  ) {
    super(message)
    this.name = 'AuthRouteError'
  }
}

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

authRouter.post('/send-otp', async (c) => {
  const body = await readJson(c)
  return c.json(await fromController(() => authController.sendOtp(body)))
})

authRouter.post('/login', async (c) => {
  const body = await readJson(c)
  const result = await fromController(() => authController.login(body))

  const { name, secure, sameSite } = config.cookie
  setCookie(c, name, result.token, { httpOnly: true, secure, sameSite, path: '/', maxAge: tokenTtlSeconds() })
  return c.json(result)
})

authRouter.post('/logout', (c) => c.json(authController.logout(c)))
