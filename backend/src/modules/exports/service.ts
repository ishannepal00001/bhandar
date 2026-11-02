// exports: business logic
// start(): Looks up the source download (it must be the user's and completed, so it has a file in B2), then hands its
//   B2 key, the clips and the caption to the tracker, which queues the render on fetchr; the result arrives over SSE.
//   The B2 key comes from the stored download, never from the request.
// list(): Queued exports first, then finished ones, each with a signed thumbnail link.
// events(): The tracker's SSE stream, asking for the exports one.
// remove(): Removes the B2 video and thumbnail (if any) before the row, so a failed delete can be retried.
// saveAs(): The name the browser saves the file under: the source's title (or "clip"), then EXPORT_FILE_SUFFIX and
//   DOWNLOAD_FILE_EXTENSION.
import { env } from 'cloudflare:workers'
import type { ExportRequest } from '../../../../schemas/exports'
import { Storage } from '../../core/utils/storage'
import { StorageError } from '../../core/utils/storage.error'
import * as downloadsModel from '../downloads/model'
import { DownloadsModelError } from '../downloads/model.error'
import { withThumbnailUrls } from '../downloads/utils'
import * as exportsModel from './model'
import { ExportsModelError } from './model.error'
import type { Export } from './model.types'
import type { DeleteResult, FileLinkResult } from './service.types'
import type { FinishedExport, QueuedExport, ShownExport } from './utils.types'
import { ExportsServiceError } from './service.error'

function tracker() {
  return env.DOWNLOAD_TRACKER.getByName(env.DOWNLOAD_TRACKER_NAME)
}

async function fromModel<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof ExportsModelError || err instanceof DownloadsModelError)) throw err
    throw new ExportsServiceError(err.message, 'DB_ERROR', { cause: err })
  }
}

async function fromStorage<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof StorageError)) throw err
    throw new ExportsServiceError(err.message, err.status === 404 ? 'NOT_FOUND' : 'STORAGE_ERROR', { cause: err })
  }
}

function toFinishedExport({ user_id: _, ...item }: Export): FinishedExport {
  return item
}

export async function start(userId: number, input: ExportRequest): Promise<QueuedExport> {
  const download = await fromModel(() => downloadsModel.findDownload(userId, input.download_id))
  if (!download) throw new ExportsServiceError('Download not found', 'NOT_FOUND')
  if (download.status !== 'completed' || !download.filename) {
    throw new ExportsServiceError('Download has no file to clip', 'NOT_COMPLETED')
  }

  const spec = { download_id: download.id, title: download.title, clips: input.clips, caption: input.caption }
  const result = await tracker().startExport(userId, spec, download.filename)
  if ('error' in result) throw new ExportsServiceError(result.error, result.kind)
  return result.job
}

export async function list(userId: number): Promise<(QueuedExport | ShownExport)[]> {
  const [queued, finished] = await Promise.all([
    tracker().listQueuedExports(userId),
    fromModel(() => exportsModel.listExports(userId)),
  ])
  return [...queued, ...(await withThumbnailUrls(finished.map(toFinishedExport)))]
}

export function events(userId: number, request: Request): Promise<Response> {
  const headers = new Headers({ 'x-user-id': String(userId), 'x-stream': 'exports' })
  return tracker().fetch(new Request(request.url, { headers, signal: request.signal }))
}

function saveAs(item: Export): string {
  return `${item.title ?? 'clip'}${env.EXPORT_FILE_SUFFIX}${env.DOWNLOAD_FILE_EXTENSION}`
}

export async function fileLink(userId: number, id: string): Promise<FileLinkResult> {
  const item = await fromModel(() => exportsModel.findExport(userId, id))
  if (!item) throw new ExportsServiceError('Export not found', 'NOT_FOUND')
  const { filename } = item
  if (item.status !== 'completed' || !filename) throw new ExportsServiceError('Export has no file', 'NOT_COMPLETED')
  const file = await fromStorage(() => new Storage(env).getFile(filename, saveAs(item)))
  return { url: file.url }
}

export async function remove(userId: number, id: string): Promise<DeleteResult> {
  const item = await fromModel(() => exportsModel.findExport(userId, id))
  if (!item) throw new ExportsServiceError('Export not found', 'NOT_FOUND')
  const { filename, thumbnail } = item
  if (filename) await fromStorage(() => new Storage(env).deleteFile(filename))
  if (thumbnail) await fromStorage(() => new Storage(env).deleteFile(thumbnail))
  await fromModel(() => exportsModel.deleteExport(userId, id))
  return { deleted: true }
}
