// Entry point: mounts api/v1 routers
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { AuthRouteError, authRouter } from './api/v1/auth'
import { migrate } from './db'
import { IsUserError } from './utils/middlewares/isUser'

await migrate()

const app = new Hono()

app.use('/api/*', logger())

app.route('/api/v1/auth', authRouter)

app.notFound((c) => c.json({ error: 'Not found' }, 404))
app.onError((err, c) => {
  if (err instanceof AuthRouteError) {
    return c.json({ error: err.message, issues: err.issues }, err.status)
  }
  if (err instanceof IsUserError) {
    if (err.status === 500) console.error(err)
    return c.json({ error: err.message }, err.status)
  }
  console.error(err)
  return c.json({ error: 'Something went wrong' }, 500)
})

export default app
