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
  error: string | null
  created_at: string
  updated_at: string
}

export type Job = QueuedJob | FinishedJob

export type DownloadRequest = { url: string }

export type FileLink = { url: string }

export type DeleteResult = { deleted: true }
