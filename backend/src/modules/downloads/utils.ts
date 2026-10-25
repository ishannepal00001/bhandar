// downloads: client for the Render download service (contract in the README)
import { env } from 'cloudflare:workers'
import type { z } from 'zod'
import { type Job, type QueuedJob, jobSchema, queuedJobSchema } from './type'

export class DownloadsUtilsError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DownloadsUtilsError'
  }
}

async function call<T>(path: string, init: RequestInit, schema: z.ZodType<T>): Promise<T> {
  const base: string = env.DOWNLOADER_URL
  if (!base || !env.DOWNLOADER_API_KEY) throw new DownloadsUtilsError('Download service is not configured')

  let res: Response
  try {
    res = await fetch(new URL(path, base), {
      ...init,
      headers: { Authorization: `Bearer ${env.DOWNLOADER_API_KEY}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(env.DOWNLOADER_TIMEOUT_SECONDS * 1000),
    })
  } catch (err) {
    throw new DownloadsUtilsError('Download service is unreachable', { cause: err })
  }
  if (!res.ok) throw new DownloadsUtilsError(`Download service answered ${res.status}`)

  const parsed = schema.safeParse(await res.json().catch(() => undefined))
  if (!parsed.success) throw new DownloadsUtilsError('Download service sent an unexpected response', { cause: parsed.error })
  return parsed.data
}

export function createJob(url: string): Promise<QueuedJob> {
  return call('/jobs', { method: 'POST', body: JSON.stringify({ url }) }, queuedJobSchema)
}

export function getJob(id: string, nextCode: string): Promise<Job> {
  const query = new URLSearchParams({ code: nextCode })
  return call(`/jobs/${encodeURIComponent(id)}?${query}`, { method: 'GET' }, jobSchema)
}
