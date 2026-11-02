// exports: business logic
// start(): Looks up the source, a download (the user's, completed) or an upload (the user's, ready), so it has a file
//   in B2, then hands its B2 key, the clips and the caption to the tracker, which queues the render on fetchr; the
//   result arrives over SSE. The B2 key comes from the stored row, never from the request.
// source(): An upload's title is its file name without the extension.
// list(): Queued exports first, then finished ones, each with a signed thumbnail link.
// events(): The tracker's SSE stream, asking for the exports one.
// remove(): Removes the B2 video and thumbnail (if any) before the row, so a failed delete can be retried. An upload
//   belongs to the exports made from it, so deleting its last one, finished or queued, deletes the upload too.
// saveAs(): The name the browser saves the file under: the source's title (or "clip"), then EXPORT_FILE_SUFFIX and
//   DOWNLOAD_FILE_EXTENSION.
import { env } from 'cloudflare:workers'
import type { ExportRequest } from '../../../../schemas/exports'
import { Storage } from '../../core/utils/storage'
import { StorageError } from '../../core/utils/storage.error'
import * as downloadsModel from '../downloads/model'
import { DownloadsModelError } from '../downloads/model.error'
import { withThumbnailUrls } from '../downloads/utils'
import * as uploadsModel from '../uploads/model'
import { UploadsModelError } from '../uploads/model.error'
import * as uploadsService from '../uploads/service'
import { UploadsServiceError } from '../uploads/service.error'
import * as exportsModel from './model'
import { ExportsModelError } from './model.error'
import type { Export } from './model.types'
import type { DeleteResult, FileLinkResult } from './service.types'
import type { ExportSpec, FinishedExport, QueuedExport, ShownExport } from './utils.types'
import { ExportsServiceError } from './service.error'

function tracker() {
  return env.DOWNLOAD_TRACKER.getByName(env.DOWNLOAD_TRACKER_NAME)
}

async function fromModel<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof ExportsModelError || err instanceof DownloadsModelError || err instanceof UploadsModelError)) {
      throw err
    }
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

async function source(userId: number, input: ExportRequest): Promise<{ spec: ExportSpec; sourceKey: string }> {
  const { clips, caption } = input
  if (input.upload_id !== undefined) {
    const uploadId = input.upload_id
    const upload = await fromModel(() => uploadsModel.findUpload(userId, uploadId))
    if (!upload) throw new ExportsServiceError('Upload not found', 'NOT_FOUND')
    if (upload.status !== 'ready') throw new ExportsServiceError("The upload hasn't finished", 'NOT_COMPLETED')
    const title = upload.name.replace(/\.[^.]+$/, '') || upload.name
    return { spec: { download_id: null, upload_id: upload.id, title, clips, caption }, sourceKey: upload.filename }
  }

  const downloadId = input.download_id ?? ''
  const download = await fromModel(() => downloadsModel.findDownload(userId, downloadId))
  if (!download) throw new ExportsServiceError('Download not found', 'NOT_FOUND')
  if (download.status !== 'completed' || !download.filename) {
    throw new ExportsServiceError('Download has no file to clip', 'NOT_COMPLETED')
  }
  return {
    spec: { download_id: download.id, upload_id: null, title: download.title, clips, caption },
    sourceKey: download.filename,
  }
}

export async function start(userId: number, input: ExportRequest): Promise<QueuedExport> {
  const { spec, sourceKey } = await source(userId, input)
  const result = await tracker().startExport(userId, spec, sourceKey)
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
  if (item.upload_id) await releaseUpload(userId, item.upload_id)
  return { deleted: true }
}

async function releaseUpload(userId: number, uploadId: string): Promise<void> {
  const [finished, queued] = await Promise.all([
    fromModel(() => exportsModel.countExportsOfUpload(uploadId)),
    tracker().listQueuedExports(userId),
  ])
  if (finished > 0 || queued.some((item) => item.upload_id === uploadId)) return

  const upload = await fromModel(() => uploadsModel.findUpload(userId, uploadId))
  if (!upload) return
  try {
    await uploadsService.remove(upload)
  } catch (err) {
    if (!(err instanceof UploadsServiceError)) throw err
    throw new ExportsServiceError(err.message, err.kind === 'DB_ERROR' ? 'DB_ERROR' : 'STORAGE_ERROR', { cause: err })
  }
}
