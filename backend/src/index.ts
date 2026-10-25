// Entry point: mounts api/v1 routers
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { sql } from 'kysely'
import { AuthRouteError, authRouter } from './api/v1/auth'
import { db } from './db'
import { IsUserError } from './core/middlewares/isUser'
import { RateLimitError, rateLimit } from './core/middlewares/rateLimit'

const app = new Hono()

app.use('/api/*', logger())
app.use('/api/*', rateLimit((env) => env.API_LIMITER))

app.route('/api/v1/auth', authRouter)

// Liveness plus a D1 round trip; outside /api so it isn't rate limited.
app.get('/health', async (c) => {
  try {
    await sql`select 1`.execute(db)
    return c.json({ status: 'ok', db: 'ok' })
  } catch (err) {
    console.error(err)
    return c.json({ status: 'error', db: 'unreachable' }, 503)
  }
})

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  if (err instanceof AuthRouteError) {
    return c.json({ error: err.message, issues: err.issues }, err.status)
  }
  if (err instanceof RateLimitError) {
    return c.json({ error: err.message }, err.status)
  }
  if (err instanceof IsUserError) {
    if (err.status === 500) console.error(err)
    return c.json({ error: err.message }, err.status)
  }
  console.error(err)
  return c.json({ error: 'Something went wrong' }, 500)
})

export default app
