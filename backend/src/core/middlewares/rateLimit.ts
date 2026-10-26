// Limits requests per client IP with a Workers rate limit binding from wrangler.jsonc.
import { createMiddleware } from 'hono/factory'
import type { RateLimitEnv } from './rateLimit.types'
import { RateLimitError } from './rateLimit.error'

export const rateLimit = (pick: (env: Env) => RateLimit) =>
  createMiddleware<RateLimitEnv>(async (c, next) => {
    const ip = c.req.header('cf-connecting-ip') ?? 'unknown'
    const { success } = await pick(c.env).limit({ key: ip })
    if (!success) throw new RateLimitError()
    await next()
  })
