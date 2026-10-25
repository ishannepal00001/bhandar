// /api/v1/downloads: accepts requests, returns JSON (and the SSE stream)
import { Hono } from 'hono'
import type { Context } from 'hono'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { isUser } from '../../core/middlewares/isUser'
import type { IsUserEnv } from '../../core/types'
import * as downloadsController from '../../modules/downloads/controller'
import { DownloadsControllerError } from '../../modules/downloads/controller'

export class DownloadsRouteError extends Error {
  constructor(
    message: string,
    readonly status: ContentfulStatusCode,
    readonly issues?: Partial<Record<string, string[]>>,
  ) {
    super(message)
    this.name = 'DownloadsRouteError'
  }
}

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

// Returns as soon as Render has queued the job; the final state comes over /events.
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
