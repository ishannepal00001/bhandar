// downloads: business logic
import { env } from 'cloudflare:workers'
import type { DownloadRequest } from '../../../../schemas/downloads'
import { Storage, StorageError } from '../../core/utils/storage'
import * as downloadsModel from './model'
import { DownloadsModelError } from './model'
import type { DeleteResult, Download, DownloadsServiceErrorKind, FileLinkResult, FinishedJob, Job, QueuedJob } from './type'
import { DownloadsUtilsError, createJob } from './utils'

export class DownloadsServiceError extends Error {
  constructor(
    message: string,
    readonly kind: DownloadsServiceErrorKind,
    options?: ErrorOptions,
  ) {
    super(message, options)
    this.name = 'DownloadsServiceError'
  }
}

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
  return { ...download, next_code: null }
}

// Queues the job on Render and hands it to the tracker; the result arrives later over SSE.
export async function start(userId: number, input: DownloadRequest): Promise<QueuedJob> {
  let job: QueuedJob
  try {
    job = await createJob(input.url)
  } catch (err) {
    if (!(err instanceof DownloadsUtilsError)) throw err
    throw new DownloadsServiceError(err.message, 'DOWNLOADER_ERROR', { cause: err })
  }
  await tracker().track(userId, job)
  return job
}

export async function list(userId: number): Promise<Job[]> {
  const [queued, finished] = await Promise.all([tracker().listQueued(userId), fromModel(() => downloadsModel.listDownloads(userId))])
  return [...queued, ...finished.map(toFinishedJob)]
}

export function events(userId: number, request: Request): Promise<Response> {
  const headers = new Headers({ 'x-user-id': String(userId) })
  return tracker().fetch(new Request(request.url, { headers, signal: request.signal }))
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
  const file = await fromStorage(() => new Storage(env).getFile(download.filename, download.title ?? download.filename))
  return { url: file.url }
}

// Removes the B2 file (if any) before the row, so a failed delete can be retried.
export async function remove(userId: number, id: string): Promise<DeleteResult> {
  const download = await fromModel(() => downloadsModel.findDownload(userId, id))
  if (!download) throw new DownloadsServiceError('Download not found', 'NOT_FOUND')
  const { filename } = download
  if (filename) await fromStorage(() => new Storage(env).deleteFile(filename))
  await fromModel(() => downloadsModel.deleteDownload(userId, id))
  return { deleted: true }
}
