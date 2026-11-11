// exports: request handling, validated against schema
// exportRequestSchema: Built once from the EXPORT_* limits in wrangler.jsonc.
import { env } from 'cloudflare:workers'
import { z } from 'zod'
import { createExportRequestSchema } from '../../../../schemas/exports'
import * as exportsService from './service'
import { ExportsServiceError } from './service.error'
import type { DeleteResult, ExportsServiceErrorKind, FileLinkResult } from './service.types'
import type { QueuedExport, ShownExport } from './utils.types'
import { ExportsControllerError } from './controller.error'

const statusByKind: Record<ExportsServiceErrorKind, ExportsControllerError['status']> = {
  NOT_FOUND: 404,
  NOT_COMPLETED: 409,
  QUEUE_FULL: 429,
  RENDERER_ERROR: 502,
  STORAGE_ERROR: 502,
  DB_ERROR: 500,
}

const exportRequestSchema = createExportRequestSchema({
  maxClips: env.EXPORT_MAX_CLIPS,
  minClipSeconds: env.EXPORT_MIN_CLIP_SECONDS,
  maxSeconds: env.EXPORT_MAX_SECONDS,
})

function parse<T>(schema: z.ZodType<T>, body: unknown): T {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    throw new ExportsControllerError('Invalid request', 400, z.flattenError(parsed.error).fieldErrors)
  }
  return parsed.data
}

async function fromService<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof ExportsServiceError)) throw err
    throw new ExportsControllerError(err.message, statusByKind[err.kind])
  }
}

export async function start(userId: number, body: unknown): Promise<QueuedExport> {
  const input = parse(exportRequestSchema, body)
  return fromService(() => exportsService.start(userId, input))
}

export function list(userId: number): Promise<(QueuedExport | ShownExport)[]> {
  return fromService(() => exportsService.list(userId))
}

export function events(userId: number, request: Request): Promise<Response> {
  return exportsService.events(userId, request)
}

export function fileLink(userId: number, id: string): Promise<FileLinkResult> {
  return fromService(() => exportsService.fileLink(userId, id))
}

export function file(userId: number, id: string, range: string | null): Promise<Response> {
  return fromService(() => exportsService.file(userId, id, range))
}

export function remove(userId: number, id: string): Promise<DeleteResult> {
  return fromService(() => exportsService.remove(userId, id))
}
