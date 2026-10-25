// downloads: types and the zod schemas for the Render download service's responses
import { z } from 'zod'

export const finalStatuses = ['completed', 'failed', 'cancelled'] as const
export type FinalStatus = (typeof finalStatuses)[number]
export type JobStatus = 'queued' | FinalStatus

// While queued, Render sends only these fields.
export const queuedJobSchema = z.object({
  id: z.string().min(1),
  source_url: z.string(),
  status: z.literal('queued'),
  created_at: z.string(),
  next_code: z.string(),
})

export const finishedJobSchema = z.object({
  id: z.string().min(1),
  source_url: z.string(),
  status: z.enum(finalStatuses),
  title: z.string().nullable(),
  // The B2 object key; set when status is completed.
  filename: z.string().nullable(),
  content_type: z.string().nullable(),
  filesize: z.number().nullable(),
  error: z.string().nullable(),
  created_at: z.string(),
  updated_at: z.string(),
  next_code: z.string().nullable(),
})

export const jobSchema = z.discriminatedUnion('status', [queuedJobSchema, finishedJobSchema])

export type QueuedJob = z.infer<typeof queuedJobSchema>
export type FinishedJob = z.infer<typeof finishedJobSchema>
export type Job = z.infer<typeof jobSchema>

// A row of the downloads table (migrations/0003_downloads.sql). next_code is only meaningful while queued.
export type Download = Omit<FinishedJob, 'next_code'> & { user_id: number }

// Sent over SSE; the event name is the job's final status.
export type DownloadEvent = { event: FinalStatus; job: FinishedJob }

export type FileLinkResult = { url: string }
export type DeleteResult = { deleted: true }

export type DownloadsServiceErrorKind = 'NOT_FOUND' | 'NOT_COMPLETED' | 'DOWNLOADER_ERROR' | 'STORAGE_ERROR' | 'DB_ERROR'
