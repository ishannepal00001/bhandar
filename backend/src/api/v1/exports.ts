// /api/v1/exports: accepts requests, returns JSON (and the SSE stream)
// POST /: Returns as soon as fetchr has queued the render; the final state comes over /events.
import { Hono } from 'hono'
import type { Context } from 'hono'
import { isUser } from '../../core/middlewares/isUser'
import type { IsUserEnv } from '../../core/types'
import * as exportsController from '../../modules/exports/controller'
import { ExportsControllerError } from '../../modules/exports/controller.error'
import { ExportsRouteError } from './exports.error'

async function readJson(c: Context): Promise<unknown> {
  return c.req.json().catch(() => {
    throw new ExportsRouteError('Body must be valid JSON', 400)
  })
}

async function fromController<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof ExportsControllerError)) throw err
    throw new ExportsRouteError(err.message, err.status, err.issues)
  }
}

export const exportsRouter = new Hono<IsUserEnv>()

exportsRouter.use(isUser)

exportsRouter.post('/', async (c) => {
  const body = await readJson(c)
  return c.json(await fromController(() => exportsController.start(c.var.user.id, body)), 202)
})

exportsRouter.get('/', async (c) => c.json(await fromController(() => exportsController.list(c.var.user.id))))

exportsRouter.get('/events', (c) => exportsController.events(c.var.user.id, c.req.raw))

exportsRouter.get('/:id/file', async (c) =>
  c.json(await fromController(() => exportsController.fileLink(c.var.user.id, c.req.param('id')))),
)

exportsRouter.get('/:id/download', async (c) =>
  fromController(() => exportsController.file(c.var.user.id, c.req.param('id'), c.req.header('Range') ?? null)),
)

exportsRouter.delete('/:id', async (c) =>
  c.json(await fromController(() => exportsController.remove(c.var.user.id, c.req.param('id')))),
)
