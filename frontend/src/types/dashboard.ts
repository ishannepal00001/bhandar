// DashboardStats.storage: Bytes across completed downloads.
// DashboardStats.failed: Failed and cancelled downloads.
// Dashboard.recent: The latest finished jobs of any status, newest first.
import type { FinishedJob, QueuedJob } from './downloads'

export type DashboardStats = {
  downloads: number
  storage: number
  queued: number
  failed: number
}

export type Dashboard = {
  stats: DashboardStats
  queued: QueuedJob[]
  recent: FinishedJob[]
}
