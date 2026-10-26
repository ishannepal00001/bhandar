// downloads: types and the zod schema for the fetchr download service's responses
// fetchrDownloadSchema: A download as fetchr returns it (POST /api/v1/downloads and GET /api/v1/downloads/{id}).
//   filename is the bare file name; the B2 key is built from it in utils.
// QueuedJob: Any fetchr status that isn't final shows as queued.
// FinishedJob.filename: The B2 object key; set when status is completed.
// Download: A row of the downloads table (migrations/0003_downloads.sql).
// DownloadEvent: Sent over SSE; the event name is the job's final status.
// StartResult: What the tracker's start() hands back over RPC; errors are plain data so their message survives.
import { z } from 'zod'

export const runningStatuses = ['queued', 'downloading', 'uploading', 'verifying'] as const
export const finalStatuses = ['completed', 'failed', 'cancelled'] as const
export type FinalStatus = (typeof finalStatuses)[number]
export type JobStatus = 'queued' | FinalStatus

export const fetchrDownloadSchema = z.object({
  id: z.string().min(1),
  source_url: z.string(),
  status: z.enum([...runningStatuses, ...finalStatuses]),
  title: z.string().nullable(),
  filename: z.string().nullable(),
  content_type: z.string().nullable(),
  filesize: z.number().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
})

export type FetchrDownload = z.infer<typeof fetchrDownloadSchema>

export type QueuedJob = {
  id: string
  source_url: string
  status: 'queued'
  created_at: string
}

export type FinishedJob = {
  id: string
  source_url: string
  status: FinalStatus
  title: string | null
  filename: string | null
  content_type: string | null
  filesize: number | null
  error: string | null
  created_at: string
  updated_at: string
}

export type Job = QueuedJob | FinishedJob

export type Download = FinishedJob & { user_id: number }

export type DownloadEvent = { event: FinalStatus; job: FinishedJob }

export type StartResult = { job: QueuedJob } | { error: string }

export type FileLinkResult = { url: string }
export type DeleteResult = { deleted: true }

export type DownloadsServiceErrorKind = 'NOT_FOUND' | 'NOT_COMPLETED' | 'DOWNLOADER_ERROR' | 'STORAGE_ERROR' | 'DB_ERROR'
