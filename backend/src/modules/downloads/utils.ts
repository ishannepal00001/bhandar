// downloads: the fetchr endpoints this module calls (its API is documented in fetchr's README)
// fetchrDownloadSchema: A download as fetchr returns it (POST /api/v1/downloads and GET /api/v1/downloads/{id}).
//   filename is the bare file name; the B2 key is built from it in toJob().
// toJob(): Running statuses collapse to queued; a completed file's name becomes its B2 key, which fetchr writes as
//   downloads/<client_id>/<id>/<filename>.
import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Fetchr } from '../../core/middlewares/fetchr'
import type { FetchrDownload, FinalStatus, Job } from './utils.types'

export const runningStatuses = ['queued', 'downloading', 'uploading', 'verifying'] as const
export const finalStatuses = ['completed', 'failed', 'cancelled'] as const

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

export function createJob(fetchr: Fetchr, url: string): Promise<FetchrDownload> {
  return fetchr.request('/api/v1/downloads', { method: 'POST', body: JSON.stringify({ url }) }, fetchrDownloadSchema)
}

export function getJob(fetchr: Fetchr, id: string): Promise<FetchrDownload> {
  return fetchr.request(`/api/v1/downloads/${encodeURIComponent(id)}`, { method: 'GET' }, fetchrDownloadSchema)
}

export function toJob(download: FetchrDownload): Job {
  const { id, source_url, status, created_at } = download
  if (!(finalStatuses as readonly string[]).includes(status)) return { id, source_url, status: 'queued', created_at }

  const filename = download.filename && `downloads/${env.DOWNLOADER_CLIENT_ID}/${id}/${download.filename}`
  return { ...download, status: status as FinalStatus, filename }
}
