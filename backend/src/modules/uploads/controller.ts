// uploads: request handling, validated against schema
// uploadRequestSchema: Built once from UPLOAD_MAX_BYTES in wrangler.jsonc.
import { env } from 'cloudflare:workers'
import { z } from 'zod'
import { createUploadRequestSchema } from '../../../../schemas/uploads'
import * as uploadsService from './service'
import { UploadsServiceError } from './service.error'
import type { CompleteResult, UploadsServiceErrorKind, UploadTicket } from './service.types'
import { UploadsControllerError } from './controller.error'

const statusByKind: Record<UploadsServiceErrorKind, UploadsControllerError['status']> = {
  NOT_FOUND: 404,
  NOT_UPLOADED: 409,
  STORAGE_ERROR: 502,
  DB_ERROR: 500,
}

const uploadRequestSchema = createUploadRequestSchema(env.UPLOAD_MAX_BYTES)

async function fromService<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    if (!(err instanceof UploadsServiceError)) throw err
    throw new UploadsControllerError(err.message, statusByKind[err.kind])
  }
}

export async function create(userId: number, body: unknown): Promise<UploadTicket> {
  const parsed = uploadRequestSchema.safeParse(body)
  if (!parsed.success) {
    throw new UploadsControllerError('Invalid request', 400, z.flattenError(parsed.error).fieldErrors)
  }
  return fromService(() => uploadsService.create(userId, parsed.data))
}

export function complete(userId: number, id: string): Promise<CompleteResult> {
  return fromService(() => uploadsService.complete(userId, id))
}
