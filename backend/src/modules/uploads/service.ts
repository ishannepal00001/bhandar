// uploads: business logic. An upload is a video from the user's device that clips are exported from. The browser sends
//   it straight to B2; the Worker only hands out the signed link and tracks the row.
// create(): Stores the row as pending and signs a PUT to uploads/<client_id>/<id>/source<.ext>, a key fetchr accepts as
//   a render source. The name on the device is kept only in the row, so it can't put odd characters in the key.
// complete(): Called once the browser's PUT finishes. Checks B2 has the file at the announced size before marking the
//   upload ready; until then it can't be exported. Completing twice is fine.
// remove(): Deletes the B2 file, then the row. Exports call it when their last export of an upload is deleted.
// cleanStale(): The daily cron. Deletes uploads older than UPLOAD_STALE_HOURS that no export, finished or queued, uses.
// extension(): The name's extension, if it looks like one, so the key keeps a recognisable file type.
import { env } from 'cloudflare:workers'
import type { UploadRequest } from '../../../../schemas/uploads'
import { Storage } from '../../core/utils/storage'
import { StorageError } from '../../core/utils/storage.error'
import * as uploadsModel from './model'
import { UploadsModelError } from './model.error'
import type { Upload } from './model.types'
import type { CompleteResult, UploadTicket } from './service.types'
import { UploadsServiceError } from './service.error'

async function fromModel<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof UploadsModelError)) throw err
    throw new UploadsServiceError(err.message, 'DB_ERROR', { cause: err })
  }
}

async function fromStorage<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof StorageError)) throw err
    throw new UploadsServiceError(err.message, 'STORAGE_ERROR', { cause: err })
  }
}

function extension(name: string): string {
  return name.match(/\.[A-Za-z0-9]{1,8}$/)?.[0].toLowerCase() ?? ''
}

export async function create(userId: number, input: UploadRequest): Promise<UploadTicket> {
  const id = crypto.randomUUID()
  const filename = `uploads/${env.DOWNLOADER_CLIENT_ID}/${id}/source${extension(input.name)}`
  const url = await fromStorage(() =>
    new Storage(env).signUploadUrl(filename, input.content_type, env.UPLOAD_URL_TTL_SECONDS),
  )
  await fromModel(() =>
    uploadsModel.insertUpload({
      id,
      user_id: userId,
      name: input.name,
      filename,
      content_type: input.content_type,
      size: input.size,
      status: 'pending',
      created_at: new Date().toISOString(),
    }),
  )
  return { id, url, headers: { 'Content-Type': input.content_type } }
}

export async function complete(userId: number, id: string): Promise<CompleteResult> {
  const upload = await fromModel(() => uploadsModel.findUpload(userId, id))
  if (!upload) throw new UploadsServiceError('Upload not found', 'NOT_FOUND')
  if (upload.status === 'ready') return { id, status: 'ready' }

  let size: number
  try {
    size = (await new Storage(env).getFile(upload.filename)).size
  } catch (err) {
    if (!(err instanceof StorageError)) throw err
    if (err.status === 404) throw new UploadsServiceError("The file hasn't reached storage yet", 'NOT_UPLOADED')
    throw new UploadsServiceError(err.message, 'STORAGE_ERROR', { cause: err })
  }
  if (size !== upload.size) throw new UploadsServiceError('The upload is incomplete, try again', 'NOT_UPLOADED')

  await fromModel(() => uploadsModel.markReady(userId, id))
  return { id, status: 'ready' }
}

export async function remove(upload: Upload): Promise<void> {
  await fromStorage(() => new Storage(env).deleteFile(upload.filename))
  await fromModel(() => uploadsModel.deleteUpload(upload.id))
}

export async function cleanStale(): Promise<number> {
  const cutoff = new Date(Date.now() - env.UPLOAD_STALE_HOURS * 60 * 60 * 1000).toISOString()
  const candidates = await fromModel(() => uploadsModel.listStaleUnused(cutoff))
  if (candidates.length === 0) return 0

  const queued = new Set(await env.DOWNLOAD_TRACKER.getByName(env.DOWNLOAD_TRACKER_NAME).queuedUploadIds())
  const stale = candidates.filter((upload) => !queued.has(upload.id))
  for (const upload of stale) await remove(upload)
  return stale.length
}
