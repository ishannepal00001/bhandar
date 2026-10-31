// downloads: types for the fetchr endpoints and the jobs built from their replies
// QueuedJob: Any fetchr status that isn't final shows as queued.
// FinishedJob.filename: The B2 object key; set when status is completed.
// FinishedJob.thumbnail: The thumbnail's B2 key; null when fetchr couldn't make one.
// ShownJob: A finished job as the API returns it, with a signed link to its thumbnail.
import type { z } from 'zod'
import type { fetchrDownloadSchema, finalStatuses } from './utils'

export type FinalStatus = (typeof finalStatuses)[number]

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
  thumbnail: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export type Job = QueuedJob | FinishedJob

export type ShownJob = FinishedJob & { thumbnail_url: string | null }
