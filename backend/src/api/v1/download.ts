// /api/v1/downloads: accepts requests, returns JSON (and the SSE stream)
// POST /: Returns as soon as fetchr has queued the job; the final state comes over /events.
import { Hono } from 'hono'
import type { Context } from 'hono'
import { isUser } from '../../core/middlewares/isUser'
import type { IsUserEnv } from '../../core/types'
import * as downloadsController from '../../modules/downloads/controller'
import { DownloadsControllerError } from '../../modules/downloads/controller.error'
import { DownloadsRouteError } from './download.error'

async function readJson(c: Context): Promise<unknown> {
  return c.req.json().catch(() => {
    throw new DownloadsRouteError('Body must be valid JSON', 400)
  })
}

async function fromController<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof DownloadsControllerError)) throw err
    throw new DownloadsRouteError(err.message, err.status, err.issues)
  }
}

export const downloadsRouter = new Hono<IsUserEnv>()

downloadsRouter.use(isUser)

downloadsRouter.post('/', async (c) => {
  const body = await readJson(c)
  return c.json(await fromController(() => downloadsController.start(c.var.user.id, body)), 202)
})

downloadsRouter.get('/', async (c) => c.json(await fromController(() => downloadsController.list(c.var.user.id))))

downloadsRouter.get('/events', (c) => downloadsController.events(c.var.user.id, c.req.raw))

downloadsRouter.get('/:id/file', async (c) =>
  c.json(await fromController(() => downloadsController.fileLink(c.var.user.id, c.req.param('id')))),
)

downloadsRouter.delete('/:id', async (c) =>
  c.json(await fromController(() => downloadsController.remove(c.var.user.id, c.req.param('id')))),
)
