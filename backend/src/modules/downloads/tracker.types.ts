// downloads: types for the DownloadTracker
// TrackedExport.spec: The ExportSpec as JSON, kept so the finished export can be stored with what it asked for.
// Stream.kind: Which SSE stream it is; downloads and exports each get their own events.
// DownloadEvent, ExportEvent: Sent over SSE; the event name is the job's final status.
// StartResult, StartExportResult: What the tracker's start() and startExport() hand back over RPC; errors are plain
//   data so their message survives, and kind says why it failed.
// Checked: A poll's outcome: the reply, or the error once fetchr has failed DOWNLOAD_MAX_POLL_FAILURES times in a row.
import type { FinishedExport, QueuedExport } from '../exports/utils.types'
import type { FinalStatus, FinishedJob, QueuedJob } from './utils.types'

export type TrackedJob = QueuedJob & {
  user_id: number
  failures: number
}

export type TrackedExport = {
  id: string
  user_id: number
  spec: string
  created_at: string
  failures: number
}

export type StreamKind = 'downloads' | 'exports'

export type Stream = {
  userId: number
  kind: StreamKind
  writer: WritableStreamDefaultWriter<Uint8Array>
}

export type DownloadEvent = { event: FinalStatus; job: FinishedJob }

export type ExportEvent = { event: FinalStatus; job: FinishedExport }

export type StartResult = { job: QueuedJob } | { error: string; kind: 'QUEUE_FULL' | 'DOWNLOADER_ERROR' }

export type StartExportResult = { job: QueuedExport } | { error: string; kind: 'QUEUE_FULL' | 'RENDERER_ERROR' }

export type Checked<T> = { result: T } | { error: string }

