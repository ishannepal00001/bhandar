// downloads: types for the DownloadTracker
// DownloadEvent: Sent over SSE; the event name is the job's final status.
// StartResult: What the tracker's start() hands back over RPC; errors are plain data so their message survives.
import type { FinalStatus, FinishedJob, QueuedJob } from './utils.types'

export type TrackedJob = QueuedJob & {
  user_id: number
  failures: number
}

export type Stream = {
  userId: number
  writer: WritableStreamDefaultWriter<Uint8Array>
}

export type DownloadEvent = { event: FinalStatus; job: FinishedJob }

export type StartResult = { job: QueuedJob } | { error: string }
