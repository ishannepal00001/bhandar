import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { recoverAfterRestart } from './db'
import { env } from './env'
import { enqueue } from './queue'
import { downloads } from './routes/downloads'
import { events } from './routes/events'
import { stats } from './routes/stats'

const app = new Hono()

app.use('/api/*', async (c, next) => {
  // The SSE stream is long-lived; logging it would only show when it closes.
  if (c.req.path === '/api/events') return next()
  return logger()(c, next)
})

app.route('/api/downloads', downloads)
app.route('/api/stats', stats)
app.route('/api/events', events)

app.get('/api/health', (c) => c.json({ ok: true }))
app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  console.error(err)
  return c.json({ error: 'Something went wrong' }, 500)
})

const requeued = recoverAfterRestart()
requeued.forEach(enqueue)
console.log(`DB ready${requeued.length ? ` — re-queued ${requeued.length} download(s)` : ''}`)
console.log(`Bhandar API listening on http://${env.HOST}:${env.PORT}`)

export default {
  port: env.PORT,
  hostname: env.HOST,
  fetch: app.fetch,
  // Bun closes idle connections after 10s by default, which would cut off SSE.
  idleTimeout: 0,
}
