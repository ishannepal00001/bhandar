// /api/v1/auth: accepts requests, returns JSON
import { Hono } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import * as authController from '../../modules/auth/controller'
import { AuthControllerError } from '../../modules/auth/controller'

export class AuthRouteError extends Error {
  constructor(
    message: string,
    readonly status: ContentfulStatusCode,
    readonly issues?: Record<string, string[]>,
  ) {
    super(message)
    this.name = 'AuthRouteError'
  }
}

export const authRouter = new Hono()

authRouter.post('/login', async (c) => {
  const body = await c.req.json().catch(() => {
    throw new AuthRouteError('Body must be valid JSON', 400)
  })

  try {
    return c.json(await authController.login(body))
  } catch (err) {
    if (!(err instanceof AuthControllerError)) throw err
    throw new AuthRouteError(err.message, err.status, err.issues)
  }
})
