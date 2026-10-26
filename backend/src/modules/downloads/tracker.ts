// downloads: the DownloadTracker Durable Object. One instance (DOWNLOAD_TRACKER_NAME) talks to fetchr, keeps the queued
// jobs, polls fetchr every DOWNLOAD_POLL_SECONDS with an alarm, moves finished jobs to D1 and pushes them over SSE.
// CODE_KEY: Where the current fetchr code is kept.
// DownloadTracker.start(): Queues the download on fetchr, starts tracking it and wakes the poller if it's asleep.
// DownloadTracker.fetch(): SSE stream for one user; the route passes the user id in the x-user-id header.
// DownloadTracker.fetchr(): Built on first use so a missing DOWNLOADER_* binding fails that request, not the SSE
//   stream. The rolling code lives in this object's storage, so it survives restarts.
// DownloadTracker.finish(): Stores the job in D1 first; if that fails the job stays tracked and the next alarm tries
//   again.
// DownloadTracker.startHeartbeat(): Comment lines keep idle connections from being dropped by proxies.
// giveUp(): Used when fetchr can't be reached DOWNLOAD_MAX_POLL_FAILURES times in a row.
import { DurableObject, env } from 'cloudflare:workers'
import { Fetchr } from '../../core/middlewares/fetchr'
import { FetchrError } from '../../core/middlewares/fetchr.error'
import { insertDownload } from './model'
import type { DownloadEvent, Stream, StartResult, TrackedJob } from './tracker.types'
import { createJob, getJob, toJob } from './utils'
import type { FinishedJob, QueuedJob } from './utils.types'

const CODE_KEY = 'fetchr_code'

const encoder = new TextEncoder()

export class DownloadTracker extends DurableObject<Env> {
  private readonly streams = new Set<Stream>()
  private heartbeat: ReturnType<typeof setInterval> | undefined
  private client: Fetchr | undefined

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        source_url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        failures INTEGER NOT NULL DEFAULT 0
      )
    `)
  }

  async start(userId: number, url: string): Promise<StartResult> {
    let job
    try {
      job = toJob(await createJob(this.fetchr(), url))
    } catch (err) {
      if (!(err instanceof FetchrError)) throw err
      return { error: err.message }
    }

    this.ctx.storage.sql.exec(
      'INSERT OR IGNORE INTO jobs (id, user_id, source_url, created_at) VALUES (?, ?, ?, ?)',
      job.id,
      userId,
      job.source_url,
      job.created_at,
    )
    if ((await this.ctx.storage.getAlarm()) === null) await this.scheduleNextPoll()
    return { job: { id: job.id, source_url: job.source_url, status: 'queued', created_at: job.created_at } }
  }

  listQueued(userId: number): QueuedJob[] {
    return this.ctx.storage.sql
      .exec<TrackedJob>('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC', userId)
      .toArray()
      .map(toQueuedJob)
  }

  async fetch(request: Request): Promise<Response> {
    const userId = Number(request.headers.get('x-user-id'))
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const stream: Stream = { userId, writer: writable.getWriter() }
    this.streams.add(stream)
    request.signal.addEventListener('abort', () => this.closeStream(stream))
    this.startHeartbeat()
    void this.write(stream, ': connected\n\n')

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    })
  }

  async alarm(): Promise<void> {
    const jobs = this.ctx.storage.sql.exec<TrackedJob>('SELECT * FROM jobs').toArray()
    await Promise.all(jobs.map((job) => this.poll(job)))

    const { left } = this.ctx.storage.sql.exec<{ left: number }>('SELECT COUNT(*) AS left FROM jobs').one()
    if (left > 0) await this.scheduleNextPoll()
  }

  private fetchr(): Fetchr {
    this.client ??= new Fetchr(this.env, {
      get: () => this.ctx.storage.kv.get<string>(CODE_KEY),
      put: (code) => this.ctx.storage.kv.put(CODE_KEY, code),
    })
    return this.client
  }

  private async poll(job: TrackedJob): Promise<void> {
    let result
    try {
      result = toJob(await getJob(this.fetchr(), job.id))
    } catch (err) {
      const failures = job.failures + 1
      if (failures < env.DOWNLOAD_MAX_POLL_FAILURES) {
        this.ctx.storage.sql.exec('UPDATE jobs SET failures = ? WHERE id = ?', failures, job.id)
        return
      }
      const message = err instanceof Error ? err.message : 'Download service failed'
      await this.finish(job.user_id, giveUp(job, message))
      return
    }

    if (result.status === 'queued') {
      this.ctx.storage.sql.exec('UPDATE jobs SET failures = 0 WHERE id = ?', job.id)
      return
    }
    await this.finish(job.user_id, result)
  }

  private async finish(userId: number, job: FinishedJob): Promise<void> {
    try {
      await insertDownload({ ...job, user_id: userId })
    } catch (err) {
      console.error(err)
      return
    }
    this.ctx.storage.sql.exec('DELETE FROM jobs WHERE id = ?', job.id)
    this.broadcast(userId, { event: job.status, job })
  }

  private broadcast(userId: number, { event, job }: DownloadEvent): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(job)}\n\n`
    for (const stream of this.streams) {
      if (stream.userId === userId) void this.write(stream, message)
    }
  }

  private async write(stream: Stream, message: string): Promise<void> {
    try {
      await stream.writer.write(encoder.encode(message))
    } catch {
      this.closeStream(stream)
    }
  }

  private closeStream(stream: Stream): void {
    if (!this.streams.delete(stream)) return
    stream.writer.close().catch(() => {})
    if (this.streams.size === 0 && this.heartbeat !== undefined) {
      clearInterval(this.heartbeat)
      this.heartbeat = undefined
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeat !== undefined) return
    this.heartbeat = setInterval(() => {
      for (const stream of this.streams) void this.write(stream, ': ping\n\n')
    }, env.SSE_HEARTBEAT_SECONDS * 1000)
  }

  private scheduleNextPoll(): Promise<void> {
    return this.ctx.storage.setAlarm(Date.now() + env.DOWNLOAD_POLL_SECONDS * 1000)
  }
}

function toQueuedJob(job: TrackedJob): QueuedJob {
  return { id: job.id, source_url: job.source_url, status: 'queued', created_at: job.created_at }
}

function giveUp(job: TrackedJob, error: string): FinishedJob {
  return {
    id: job.id,
    source_url: job.source_url,
    status: 'failed',
    title: null,
    filename: null,
    content_type: null,
    filesize: null,
    error,
    created_at: job.created_at,
    updated_at: new Date().toISOString(),
  }
}
