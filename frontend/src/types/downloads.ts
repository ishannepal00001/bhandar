// FinishedJob.thumbnail: The thumbnail's B2 key; null when fetchr couldn't make one.
// FinishedJob.thumbnail_url: A signed link to it from GET /downloads and /dashboard (expires after
//   STORAGE_URL_TTL_SECONDS); absent on SSE events.
export type FinalStatus = 'completed' | 'failed' | 'cancelled'

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
  thumbnail: string | null
  thumbnail_url?: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export type Job = QueuedJob | FinishedJob

export type DownloadRequest = { url: string }

export type FileLink = { url: string }

export type DeleteResult = { deleted: true }
