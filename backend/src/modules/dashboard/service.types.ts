// dashboard: types for the service
// DashboardStats.storage: Bytes across completed downloads.
// DashboardStats.failed: Failed and cancelled downloads.
import type { QueuedJob, ShownJob } from '../downloads/utils.types'

export type DashboardStats = {
  downloads: number
  storage: number
  queued: number
  failed: number
}

export type Dashboard = {
  stats: DashboardStats
  queued: QueuedJob[]
  recent: ShownJob[]
}
