// downloads: request handling, validated against schema
import { env } from 'cloudflare:workers'
import { z } from 'zod'
import { createDownloadRequestSchema } from '../../../../schemas/downloads'
import * as downloadsService from './service'
import { DownloadsServiceError } from './service.error'
import type { DeleteResult, DownloadsServiceErrorKind, FileLinkResult, Job, QueuedJob } from './type'
import { DownloadsControllerError } from './controller.error'

const statusByKind: Record<DownloadsServiceErrorKind, DownloadsControllerError['status']> = {
  NOT_FOUND: 404,
  NOT_COMPLETED: 409,
  DOWNLOADER_ERROR: 502,
  STORAGE_ERROR: 502,
  DB_ERROR: 500,
}

const downloadRequestSchema = createDownloadRequestSchema(env.DOWNLOAD_ALLOWED_HOSTS)

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new DownloadsControllerError('Invalid request', 400, z.flattenError(parsed.error).fieldErrors)
  }
  return parsed.data
}

async function fromService<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof DownloadsServiceError)) throw err
    throw new DownloadsControllerError(err.message, statusByKind[err.kind])
  }
}

export async function start(userId: number, body: unknown): Promise<QueuedJob> {
  const input = parse(downloadRequestSchema, body)
  return fromService(() => downloadsService.start(userId, input))
}

export function list(userId: number): Promise<Job[]> {
  return fromService(() => downloadsService.list(userId))
}

export function events(userId: number, request: Request): Promise<Response> {
  return downloadsService.events(userId, request)
}

export function fileLink(userId: number, id: string): Promise<FileLinkResult> {
  return fromService(() => downloadsService.fileLink(userId, id))
}

export function remove(userId: number, id: string): Promise<DeleteResult> {
  return fromService(() => downloadsService.remove(userId, id))
}
