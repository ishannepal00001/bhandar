// dashboard: db queries on the BHANDAR_DB D1 binding; reads the downloads table
// totals(): SUM over no rows is NULL, hence the COALESCEs.
// recentDownloads(): Leaves out user_id so rows are FinishedJobs as they are.
import { env } from 'cloudflare:workers'
import type { FinishedJob } from '../downloads/utils.types'
import type { Totals } from './model.types'
import { DashboardModelError } from './model.error'

async function query<T>(message: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    throw new DashboardModelError(message, { cause: err })
  }
}

export function totals(userId: number): Promise<Totals> {
  return query('Failed to count downloads', async () => {
    const totals = await env.BHANDAR_DB.prepare(
      "SELECT COALESCE(SUM(status = 'completed'), 0) AS downloads, " +
        "COALESCE(SUM(CASE WHEN status = 'completed' THEN filesize END), 0) AS storage, " +
        "COALESCE(SUM(status <> 'completed'), 0) AS failed " +
        'FROM downloads WHERE user_id = ?',
    )
      .bind(userId)
      .first<Totals>()
    return totals ?? { downloads: 0, storage: 0, failed: 0 }
  })
}

export function recentDownloads(userId: number, limit: number): Promise<FinishedJob[]> {
  return query('Failed to list recent downloads', async () => {
    const { results } = await env.BHANDAR_DB.prepare(
      'SELECT id, source_url, status, title, filename, content_type, filesize, thumbnail, error, created_at, updated_at ' +
        'FROM downloads WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
    )
      .bind(userId, limit)
      .all<FinishedJob>()
    return results
  })
}
