// downloads: the DownloadTracker Durable Object. One instance (DOWNLOAD_TRACKER_NAME) talks to fetchr, keeps the queued
// downloads and exports, polls fetchr every DOWNLOAD_POLL_SECONDS with an alarm, moves finished ones to D1 and pushes
// them over SSE.
// Exports live here too, not in a tracker of their own: fetchr keeps one rolling code per client and rotates it on
//   every request, so every call to fetchr has to go through this one object's client, one at a time. A second object
//   would hold its own copy of the code and the two would keep invalidating each other.
// CODE_KEY: Where the current fetchr code is kept.
// DownloadTracker.starting, startingExports: Start waiting on fetchr. Counted against DOWNLOAD_MAX_QUEUED and
//   EXPORT_MAX_QUEUED so two requests at once can't both take the last slot while the first is waiting on fetchr.
// DownloadTracker.start(): Queues the download on fetchr, starts tracking it and wakes the poller if it's asleep.
//   Refuses once DOWNLOAD_MAX_QUEUED downloads are queued or starting.
// DownloadTracker.startExport(): The same for a render of clips from a download already in B2 (sourceKey), refused
//   once EXPORT_MAX_QUEUED exports are queued or starting.
// DownloadTracker.queuedUploadIds(): The uploads that queued exports render from, so the stale-upload cleanup leaves
//   them alone.
// DownloadTracker.fetch(): SSE stream for one user; the route passes the user id in the x-user-id header and which
//   stream in x-stream (downloads unless it's "exports").
// DownloadTracker.alarm(): Polls at most DOWNLOAD_MAX_QUEUED downloads and EXPORT_MAX_QUEUED exports, oldest first.
//   Unpolled jobs keep running on fetchr and are picked up on a later alarm.
// DownloadTracker.fetchr(): Built on first use so a missing DOWNLOADER_* binding fails that request, not the SSE
//   stream. The rolling code lives in this object's storage, so it survives restarts.
// DownloadTracker.check(): Runs one poll. A failure is counted on the job's row; once DOWNLOAD_MAX_POLL_FAILURES are
//   reached in a row it hands back the error so the job can be given up on.
// DownloadTracker.finish(), finishExport(): Store the job in D1 first; if that fails the job stays tracked and the next
//   alarm tries again.
// DownloadTracker.startHeartbeat(): Comment lines keep idle connections from being dropped by proxies.
// giveUp(): Used when fetchr can't be reached DOWNLOAD_MAX_POLL_FAILURES times in a row.
import { DurableObject, env } from 'cloudflare:workers'
import { Fetchr } from '../../core/middlewares/fetchr'
import { FetchrError } from '../../core/middlewares/fetchr.error'
import { insertExport } from '../exports/model'
import { createRender, failedExport, getRender, toExport } from '../exports/utils'
import type { ExportSpec, FinishedExport, QueuedExport } from '../exports/utils.types'
import { insertDownload } from './model'
import type {
  Checked,
  DownloadEvent,
  ExportEvent,
  StartExportResult,
  StartResult,
  Stream,
  StreamKind,
  TrackedExport,
  TrackedJob,
} from './tracker.types'
import { createJob, getJob, toJob } from './utils'
import type { FinishedJob, QueuedJob } from './utils.types'

const CODE_KEY = 'fetchr_code'

const encoder = new TextEncoder()

export class DownloadTracker extends DurableObject<Env> {
  private readonly streams = new Set<Stream>()
  private heartbeat: ReturnType<typeof setInterval> | undefined
  private client: Fetchr | undefined
  private starting = 0
  private startingExports = 0

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
    this.ctx.storage.sql.exec(`
      CREATE TABLE IF NOT EXISTS exports (
        id TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        spec TEXT NOT NULL,
        created_at TEXT NOT NULL,
        failures INTEGER NOT NULL DEFAULT 0
      )
    `)
  }

  async start(userId: number, url: string): Promise<StartResult> {
    if (this.count('jobs') + this.starting >= env.DOWNLOAD_MAX_QUEUED) {
      return { kind: 'QUEUE_FULL', error: `${env.DOWNLOAD_MAX_QUEUED} downloads are already queued, wait for one to finish` }
    }

    this.starting++
    let job
    try {
      job = toJob(await createJob(this.fetchr(), url))
    } catch (err) {
      if (!(err instanceof FetchrError)) throw err
      return { kind: 'DOWNLOADER_ERROR', error: err.message }
    } finally {
      this.starting--
    }

    this.ctx.storage.sql.exec(
      'INSERT OR IGNORE INTO jobs (id, user_id, source_url, created_at) VALUES (?, ?, ?, ?)',
      job.id,
      userId,
      job.source_url,
      job.created_at,
    )
    await this.wakePoller()
    return { job: { id: job.id, source_url: job.source_url, status: 'queued', created_at: job.created_at } }
  }

  async startExport(userId: number, spec: ExportSpec, sourceKey: string): Promise<StartExportResult> {
    if (this.count('exports') + this.startingExports >= env.EXPORT_MAX_QUEUED) {
      return { kind: 'QUEUE_FULL', error: `${env.EXPORT_MAX_QUEUED} exports are already queued, wait for one to finish` }
    }

    this.startingExports++
    let render
    try {
      render = await createRender(this.fetchr(), { source_key: sourceKey, clips: spec.clips, caption: spec.caption })
    } catch (err) {
      if (!(err instanceof FetchrError)) throw err
      return { kind: 'RENDERER_ERROR', error: err.message }
    } finally {
      this.startingExports--
    }

    this.ctx.storage.sql.exec(
      'INSERT OR IGNORE INTO exports (id, user_id, spec, created_at) VALUES (?, ?, ?, ?)',
      render.id,
      userId,
      JSON.stringify(spec),
      render.created_at,
    )
    await this.wakePoller()
    return { job: { ...spec, id: render.id, status: 'queued', created_at: render.created_at } }
  }

  listQueued(userId: number): QueuedJob[] {
    return this.ctx.storage.sql
      .exec<TrackedJob>('SELECT * FROM jobs WHERE user_id = ? ORDER BY created_at DESC', userId)
      .toArray()
      .map(toQueuedJob)
  }

  listQueuedExports(userId: number): QueuedExport[] {
    return this.ctx.storage.sql
      .exec<TrackedExport>('SELECT * FROM exports WHERE user_id = ? ORDER BY created_at DESC', userId)
      .toArray()
      .map(toQueuedExport)
  }

  queuedUploadIds(): string[] {
    return this.ctx.storage.sql
      .exec<TrackedExport>('SELECT * FROM exports')
      .toArray()
      .map((job) => toQueuedExport(job).upload_id)
      .filter((id): id is string => id !== null)
  }

  async fetch(request: Request): Promise<Response> {
    const userId = Number(request.headers.get('x-user-id'))
    const kind: StreamKind = request.headers.get('x-stream') === 'exports' ? 'exports' : 'downloads'
    const { readable, writable } = new TransformStream<Uint8Array, Uint8Array>()
    const stream: Stream = { userId, kind, writer: writable.getWriter() }
    this.streams.add(stream)
    request.signal.addEventListener('abort', () => this.closeStream(stream))
    this.startHeartbeat()
    void this.write(stream, ': connected\n\n')

    return new Response(readable, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
    })
  }

  async alarm(): Promise<void> {
    const jobs = this.ctx.storage.sql
      .exec<TrackedJob>('SELECT * FROM jobs ORDER BY created_at ASC LIMIT ?', env.DOWNLOAD_MAX_QUEUED)
      .toArray()
    const exports = this.ctx.storage.sql
      .exec<TrackedExport>('SELECT * FROM exports ORDER BY created_at ASC LIMIT ?', env.EXPORT_MAX_QUEUED)
      .toArray()
    await Promise.all([...jobs.map((job) => this.poll(job)), ...exports.map((job) => this.pollExport(job))])

    if (this.count('jobs') + this.count('exports') > 0) await this.scheduleNextPoll()
  }

  private fetchr(): Fetchr {
    this.client ??= new Fetchr(this.env, {
      get: () => this.ctx.storage.kv.get<string>(CODE_KEY),
      put: (code) => this.ctx.storage.kv.put(CODE_KEY, code),
    })
    return this.client
  }

  private count(table: 'jobs' | 'exports'): number {
    return this.ctx.storage.sql.exec<{ count: number }>(`SELECT COUNT(*) AS count FROM ${table}`).one().count
  }

  private async check<T>(
    table: 'jobs' | 'exports',
    job: { id: string; failures: number },
    request: () => Promise<T>,
  ): Promise<Checked<T> | null> {
    try {
      return { result: await request() }
    } catch (err) {
      const failures = job.failures + 1
      if (failures < env.DOWNLOAD_MAX_POLL_FAILURES) {
        this.ctx.storage.sql.exec(`UPDATE ${table} SET failures = ? WHERE id = ?`, failures, job.id)
        return null
      }
      return { error: err instanceof Error ? err.message : 'Download service failed' }
    }
  }

  private async poll(job: TrackedJob): Promise<void> {
    const checked = await this.check('jobs', job, async () => toJob(await getJob(this.fetchr(), job.id)))
    if (!checked) return
    if ('error' in checked) return this.finish(job.user_id, giveUp(job, checked.error))
    if (checked.result.status === 'queued') {
      this.ctx.storage.sql.exec('UPDATE jobs SET failures = 0 WHERE id = ?', job.id)
      return
    }
    await this.finish(job.user_id, checked.result)
  }

  private async pollExport(job: TrackedExport): Promise<void> {
    const queued = toQueuedExport(job)
    const checked = await this.check('exports', job, async () => toExport(await getRender(this.fetchr(), job.id), queued))
    if (!checked) return
    if ('error' in checked) return this.finishExport(job.user_id, failedExport(queued, checked.error))
    if (checked.result.status === 'queued') {
      this.ctx.storage.sql.exec('UPDATE exports SET failures = 0 WHERE id = ?', job.id)
      return
    }
    await this.finishExport(job.user_id, checked.result)
  }

  private async finish(userId: number, job: FinishedJob): Promise<void> {
    try {
      await insertDownload({ ...job, user_id: userId })
    } catch (err) {
      console.error(err)
      return
    }
    this.ctx.storage.sql.exec('DELETE FROM jobs WHERE id = ?', job.id)
    this.broadcast('downloads', userId, { event: job.status, job })
  }

  private async finishExport(userId: number, job: FinishedExport): Promise<void> {
    try {
      await insertExport({ ...job, user_id: userId })
    } catch (err) {
      console.error(err)
      return
    }
    this.ctx.storage.sql.exec('DELETE FROM exports WHERE id = ?', job.id)
    this.broadcast('exports', userId, { event: job.status, job })
  }

  private broadcast(kind: StreamKind, userId: number, { event, job }: DownloadEvent | ExportEvent): void {
    const message = `event: ${event}\ndata: ${JSON.stringify(job)}\n\n`
    for (const stream of this.streams) {
      if (stream.userId === userId && stream.kind === kind) void this.write(stream, message)
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

  private async wakePoller(): Promise<void> {
    if ((await this.ctx.storage.getAlarm()) === null) await this.scheduleNextPoll()
  }

  private scheduleNextPoll(): Promise<void> {
    return this.ctx.storage.setAlarm(Date.now() + env.DOWNLOAD_POLL_SECONDS * 1000)
  }
}

function toQueuedJob(job: TrackedJob): QueuedJob {
  return { id: job.id, source_url: job.source_url, status: 'queued', created_at: job.created_at }
}

function toQueuedExport(job: TrackedExport): QueuedExport {
  const spec: ExportSpec = JSON.parse(job.spec)
  return { ...spec, id: job.id, status: 'queued', created_at: job.created_at }
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
    thumbnail: null,
    error,
    created_at: job.created_at,
    updated_at: new Date().toISOString(),
  }
}
