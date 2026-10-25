// Limits requests per client IP with a Workers rate limit binding from wrangler.jsonc.
import { createMiddleware } from 'hono/factory'
import type { RateLimitEnv } from './rateLimit.types'

export class RateLimitError extends Error {
  readonly status = 429

  constructor() {
    super('Too many requests, try again in a minute')
    this.name = 'RateLimitError'
  }
}

export const rateLimit = (pick: (env: Env) => RateLimit) =>
  createMiddleware<RateLimitEnv>(async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') ?? 'unknown'
    const { success } = await pick(c.env).limit({ key: ip })
    if (!success) throw new RateLimitError()
    await next()
  })
