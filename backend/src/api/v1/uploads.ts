// /api/v1/uploads: accepts requests, returns JSON
// POST /: Returns where to PUT the file (201); the browser sends it straight to B2, then calls /:id/complete.
// POST /:id/complete: Marks the upload ready once B2 has it, so it can be exported.
import { Hono } from 'hono'
import type { Context } from 'hono'
import { isUser } from '../../core/middlewares/isUser'
import type { IsUserEnv } from '../../core/types'
import * as uploadsController from '../../modules/uploads/controller'
import { UploadsControllerError } from '../../modules/uploads/controller.error'
import { UploadsRouteError } from './uploads.error'

async function readJson(c: Context): Promise<unknown> {
  return c.req.json().catch(() => {
    throw new UploadsRouteError('Body must be valid JSON', 400)
  })
}

async function fromController<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof UploadsControllerError)) throw err
    throw new UploadsRouteError(err.message, err.status, err.issues)
  }
}

export const uploadsRouter = new Hono<IsUserEnv>()

uploadsRouter.use(isUser)

uploadsRouter.post('/', async (c) => {
  const body = await readJson(c)
  return c.json(await fromController(() => uploadsController.create(c.var.user.id, body)), 201)
})

uploadsRouter.post('/:id/complete', async (c) =>
  c.json(await fromController(() => uploadsController.complete(c.var.user.id, c.req.param('id')))),
)
