// exports: the fetchr render endpoints this module calls (its API is documented in fetchr's README and backend/API.md)
// createRender(), getRender(): A render comes back in exactly the shape of a fetchr download, so fetchrDownloadSchema
//   parses it.
// toExport(): Running statuses collapse to queued; a finished render's file and thumbnail names become their B2 keys,
//   which fetchr writes as renders/<client_id>/<id>/<name>.
// failedExport(): Used when fetchr can't be reached DOWNLOAD_MAX_POLL_FAILURES times in a row.
import { env } from 'cloudflare:workers'
import type { Fetchr } from '../../core/middlewares/fetchr'
import { fetchrDownloadSchema, finalStatuses } from '../downloads/utils'
import type { FetchrDownload, FinalStatus } from '../downloads/utils.types'
import type { ExportSpec, FinishedExport, QueuedExport, RenderRequest } from './utils.types'

export function createRender(fetchr: Fetchr, render: RenderRequest): Promise<FetchrDownload> {
  return fetchr.request('/api/v1/renders', { method: 'POST', body: JSON.stringify(render) }, fetchrDownloadSchema)
}

export function getRender(fetchr: Fetchr, id: string): Promise<FetchrDownload> {
  return fetchr.request(`/api/v1/renders/${encodeURIComponent(id)}`, { method: 'GET' }, fetchrDownloadSchema)
}

export function toExport(render: FetchrDownload, spec: ExportSpec): QueuedExport | FinishedExport {
  const { id, status, created_at } = render
  if (!(finalStatuses as readonly string[]).includes(status)) return { ...spec, id, status: 'queued', created_at }

  const key = (name: string | null) => name && `renders/${env.DOWNLOADER_CLIENT_ID}/${id}/${name}`
  return {
    ...spec,
    id,
    status: status as FinalStatus,
    filename: key(render.filename),
    content_type: render.content_type,
    filesize: render.filesize,
    thumbnail: key(render.thumbnail),
    error: render.error,
    created_at,
    updated_at: render.updated_at,
  }
}

export function failedExport(job: QueuedExport, error: string): FinishedExport {
  return {
    ...job,
    status: 'failed',
    filename: null,
    content_type: null,
    filesize: null,
    thumbnail: null,
    error,
    updated_at: new Date().toISOString(),
  }
}
