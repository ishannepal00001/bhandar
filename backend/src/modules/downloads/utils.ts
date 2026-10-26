// downloads: the fetchr endpoints this module calls (its API is documented in fetchr's README)
// toJob(): Running statuses collapse to queued; a completed file's name becomes its B2 key, which fetchr writes as
//   downloads/<client_id>/<id>/<filename>.
import { env } from 'cloudflare:workers'
import type { Fetchr } from '../../core/middlewares/fetchr'
import { type FetchrDownload, type FinalStatus, type Job, fetchrDownloadSchema, finalStatuses } from './type'

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
