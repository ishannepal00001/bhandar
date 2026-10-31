// downloads: the fetchr endpoints this module calls (its API is documented in fetchr's README)
// fetchrDownloadSchema: A download as fetchr returns it (POST /api/v1/downloads and GET /api/v1/downloads/{id}).
//   filename is the bare file name; the B2 key is built from it in toJob().
// fetchrDownloadSchema.thumbnail: Defaults to null so a fetchr without thumbnails still passes.
// toJob(): Running statuses collapse to queued; a completed file's and thumbnail's names become their B2 keys, which
//   fetchr writes as downloads/<client_id>/<id>/<name>.
// withThumbnailUrls(): Signs each thumbnail. If storage isn't configured the jobs come back without links rather than
//   failing the whole list.
import { env } from 'cloudflare:workers'
import { z } from 'zod'
import type { Fetchr } from '../../core/middlewares/fetchr'
import { Storage } from '../../core/utils/storage'
import { StorageError } from '../../core/utils/storage.error'
import type { FetchrDownload, FinalStatus, FinishedJob, Job, ShownJob } from './utils.types'

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
  thumbnail: z.string().nullable().default(null),
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

  const key = (name: string | null) => name && `downloads/${env.DOWNLOADER_CLIENT_ID}/${id}/${name}`
  return {
    ...download,
    status: status as FinalStatus,
    filename: key(download.filename),
    thumbnail: key(download.thumbnail),
  }
}

export async function withThumbnailUrls(jobs: FinishedJob[]): Promise<ShownJob[]> {
  let storage: Storage
  try {
    storage = new Storage(env)
  } catch (err) {
    if (!(err instanceof StorageError)) throw err
    console.error(err)
    return jobs.map((job) => ({ ...job, thumbnail_url: null }))
  }
  return Promise.all(
    jobs.map(async (job) => ({ ...job, thumbnail_url: job.thumbnail ? await storage.signUrl(job.thumbnail) : null })),
  )
}
