// dashboard: business logic
// get(): Queued jobs come from the DownloadTracker, finished ones from D1; recent holds the latest
//   DASHBOARD_RECENT_LIMIT of them.
import { env } from 'cloudflare:workers'
import * as dashboardModel from './model'
import { DashboardModelError } from './model.error'
import type { Dashboard } from './service.types'
import { DashboardServiceError } from './service.error'

async function fromModel<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof DashboardModelError)) throw err
    throw new DashboardServiceError(err.message, { cause: err })
  }
}

export async function get(userId: number): Promise<Dashboard> {
  const tracker = env.DOWNLOAD_TRACKER.getByName(env.DOWNLOAD_TRACKER_NAME)
  const [queued, totals, recent] = await Promise.all([
    tracker.listQueued(userId),
    fromModel(() => dashboardModel.totals(userId)),
    fromModel(() => dashboardModel.recentDownloads(userId, env.DASHBOARD_RECENT_LIMIT)),
  ])
  return { stats: { ...totals, queued: queued.length }, queued, recent }
}
