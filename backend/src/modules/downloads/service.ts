// downloads: business logic
// start(): Hands the link to the tracker, which queues it on fetchr; the result arrives later over SSE.
// list(): Finished jobs carry a signed thumbnail link.
// remove(): Removes the B2 video and thumbnail (if any) before the row, so a failed delete can be retried.
// saveAs(): The name the browser saves the file under: the title, or the key's file name without its extension, ending
//   in DOWNLOAD_FILE_EXTENSION.
import { env } from 'cloudflare:workers'
import type { DownloadRequest } from '../../../../schemas/downloads'
import { Storage } from '../../core/utils/storage'
import { StorageError } from '../../core/utils/storage.error'
import * as downloadsModel from './model'
import { DownloadsModelError } from './model.error'
import type { Download } from './model.types'
import type { DeleteResult, FileLinkResult } from './service.types'
import { withThumbnailUrls } from './utils'
import type { FinishedJob, QueuedJob, ShownJob } from './utils.types'
import { DownloadsServiceError } from './service.error'

function tracker() {
  return env.DOWNLOAD_TRACKER.getByName(env.DOWNLOAD_TRACKER_NAME)
}

async function fromModel<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof DownloadsModelError)) throw err
    throw new DownloadsServiceError(err.message, 'DB_ERROR', { cause: err })
  }
}

async function fromStorage<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof StorageError)) throw err
    throw new DownloadsServiceError(err.message, err.status === 404 ? 'NOT_FOUND' : 'STORAGE_ERROR', { cause: err })
  }
}

function toFinishedJob({ user_id: _, ...download }: Download): FinishedJob {
  return download
}

export async function start(userId: number, input: DownloadRequest): Promise<QueuedJob> {
  const result = await tracker().start(userId, input.url)
  if ('error' in result) throw new DownloadsServiceError(result.error, result.kind)
  return result.job
}

export async function list(userId: number): Promise<(QueuedJob | ShownJob)[]> {
  const [queued, finished] = await Promise.all([tracker().listQueued(userId), fromModel(() => downloadsModel.listDownloads(userId))])
  return [...queued, ...(await withThumbnailUrls(finished.map(toFinishedJob)))]
}

export function events(userId: number, request: Request): Promise<Response> {
  const headers = new Headers({ 'x-user-id': String(userId) })
  return tracker().fetch(new Request(request.url, { headers, signal: request.signal }))
}

function saveAs(download: Download & { filename: string }): string {
  const name = download.title ?? (download.filename.split('/').pop() ?? download.filename).replace(/\.[^.]+$/, '')
  const extension = env.DOWNLOAD_FILE_EXTENSION
  return name.toLowerCase().endsWith(extension.toLowerCase()) ? name : `${name}${extension}`
}

async function findCompleted(userId: number, id: string): Promise<Download & { filename: string }> {
  const download = await fromModel(() => downloadsModel.findDownload(userId, id))
  if (!download) throw new DownloadsServiceError('Download not found', 'NOT_FOUND')
  if (download.status !== 'completed' || !download.filename) {
    throw new DownloadsServiceError('Download has no file', 'NOT_COMPLETED')
  }
  return { ...download, filename: download.filename }
}

export async function fileLink(userId: number, id: string): Promise<FileLinkResult> {
  const download = await findCompleted(userId, id)
  const file = await fromStorage(() => new Storage(env).getFile(download.filename, saveAs(download)))
  return { url: file.url }
}

export async function remove(userId: number, id: string): Promise<DeleteResult> {
  const download = await fromModel(() => downloadsModel.findDownload(userId, id))
  if (!download) throw new DownloadsServiceError('Download not found', 'NOT_FOUND')
  const { filename, thumbnail } = download
  if (filename) await fromStorage(() => new Storage(env).deleteFile(filename))
  if (thumbnail) await fromStorage(() => new Storage(env).deleteFile(thumbnail))
  await fromModel(() => downloadsModel.deleteDownload(userId, id))
  return { deleted: true }
}
