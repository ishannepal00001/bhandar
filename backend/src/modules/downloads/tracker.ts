// downloads: the DownloadTracker Durable Object. One instance (DOWNLOAD_TRACKER_NAME) keeps the queued jobs,
// polls Render every DOWNLOAD_POLL_SECONDS with an alarm, moves finished jobs to D1 and pushes them over SSE.
import { DurableObject, env } from 'cloudflare:workers'
import { insertDownload } from './model'
import type { DownloadEvent, FinishedJob, QueuedJob } from './type'
import { getJob } from './utils'

type TrackedJob = QueuedJob & {
  user_id: number
  failures: number
}

type Stream = {
  userId: number
  writer: WritableStreamDefaultWriter<Uint8Array>
}

const encoder = new TextEncoder()

export class DownloadTracker extends DurableObject<Env> {
  private readonly streams = new Set<Stream>()
  private heartbeat: ReturnType<typeof setInterval> | undefined

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        source_url TEXT NOT NULL,
        created_at TEXT NOT NULL,
        next_code TEXT NOT NULL,
        failures INTEGER NOT NULL DEFAULT 0
      )
    `)
  }

  // Starts tracking a job Render has just queued, and wakes the poller if it's asleep.
  async track(userId: number, job: QueuedJob): Promise<void> {
    this.ctx.storage.sql.exec(
      'INSERT OR IGNORE INTO jobs (id, user_id, source_url, created_at, next_code) VALUES (?, ?, ?, ?, ?)',
      job.id,
      userId,
      job.source_url,
      job.created_at,
      job.next_code,
    )
    if ((await this.ctx.storage.getAlarm()) === null) await this.scheduleNextPoll()
  }

  listQueued(userId: number): QueuedJob[] {
    return this.ctx.storage.sql
      .exec<TrackedJob>('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC', userId)
      .toArray()
      .map(toQueuedJob)
  }

  // SSE stream for one user; the route passes the user id in the x-user-id header.
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

  private async poll(job: TrackedJob): Promise<void> {
    let result
    try {
      result = await getJob(job.id, job.next_code)
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
      this.ctx.storage.sql.exec('UPDATE jobs SET next_code = ?, failures = 0 WHERE id = ?', result.next_code, job.id)
      return
    }
    await this.finish(job.user_id, result)
  }

  // Stores the job in D1 first; if that fails the job stays tracked and the next alarm tries again.
  private async finish(userId: number, job: FinishedJob): Promise<void> {
    const { next_code: _, ...row } = job
    try {
      await insertDownload({ ...row, user_id: userId })
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

  // Comment lines keep idle connections from being dropped by proxies.
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
  return { id: job.id, source_url: job.source_url, status: 'queued', created_at: job.created_at, next_code: job.next_code }
}

// Used when Render can't be reached DOWNLOAD_MAX_POLL_FAILURES times in a row.
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
    next_code: null,
  }
}
