// Entry point: mounts api/v1 routers
// cors(), csrf(): The frontend is on another site, so only FRONTEND_ORIGIN may call /api with the cookie. Both run
//   before the rate limiter so preflights aren't counted and its 429s carry CORS headers. csrf() rejects form-style
//   requests from any other origin, which CORS alone doesn't stop.
// GET /health: Liveness plus a D1 round trip; outside /api so it isn't rate limited.
// export DownloadTracker: Durable Object classes must be exported from the Worker's entry file.
import { env } from 'cloudflare:workers'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { csrf } from 'hono/csrf'
import { HTTPException } from 'hono/http-exception'
import { logger } from 'hono/logger'
import { authRouter } from './api/v1/auth'
import { AuthRouteError } from './api/v1/auth.error'
import { dashboardRouter } from './api/v1/dashboard'
import { DashboardRouteError } from './api/v1/dashboard.error'
import { downloadsRouter } from './api/v1/download'
import { DownloadsRouteError } from './api/v1/download.error'
import { IsUserError } from './core/middlewares/isUser.error'
import { rateLimit } from './core/middlewares/rateLimit'
import { RateLimitError } from './core/middlewares/rateLimit.error'

const app = new Hono()

app.use('/api/*', logger())
app.use('/api/*', cors({ origin: env.FRONTEND_ORIGIN, credentials: true }))
app.use('/api/*', csrf({ origin: env.FRONTEND_ORIGIN }))
app.use('/api/*', rateLimit((env) => env.API_LIMITER))

app.route('/api/v1/auth', authRouter)
app.route('/api/v1/downloads', downloadsRouter)
app.route('/api/v1/dashboard', dashboardRouter)

app.get('/health', async (c) => {
  try {
    await env.BHANDAR_DB.prepare('SELECT 1').first()
    return c.json({ status: 'ok', db: 'ok' })
  } catch (err) {
    console.error(err)
    return c.json({ status: 'error', db: 'unreachable' }, 503)
  }
})

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  if (err instanceof AuthRouteError || err instanceof DownloadsRouteError) {
    return c.json({ error: err.message, issues: err.issues }, err.status)
  }
  if (err instanceof HTTPException) return err.getResponse()
  if (err instanceof DashboardRouteError || err instanceof RateLimitError) {
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

export { DownloadTracker } from './modules/downloads/tracker'
