// /api/v1/dashboard: accepts requests, returns JSON
// GET /: Stats, the queued jobs and the latest finished ones in one call; refetch it when /downloads/events fires.
import { Hono } from 'hono'
import { isUser } from '../../core/middlewares/isUser'
import type { IsUserEnv } from '../../core/types'
import * as dashboardController from '../../modules/dashboard/controller'
import { DashboardControllerError } from '../../modules/dashboard/controller.error'
import { DashboardRouteError } from './dashboard.error'

async function fromController<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof DashboardControllerError)) throw err
    throw new DashboardRouteError(err.message, err.status)
  }
}

export const dashboardRouter = new Hono<IsUserEnv>()

dashboardRouter.use(isUser)

dashboardRouter.get('/', async (c) => c.json(await fromController(() => dashboardController.get(c.var.user.id))))
