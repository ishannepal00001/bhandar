import { Database } from 'bun:sqlite'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { env } from './env'
import type { Download, DownloadStatus, Quality, Stats } from './types'

mkdirSync(env.DATA_DIR, { recursive: true })

const db = new Database(join(env.DATA_DIR, 'bhandar.db'), { create: true, strict: true })
db.run('PRAGMA journal_mode = WAL')
db.run(`
  CREATE TABLE IF NOT EXISTS downloads (
    id          TEXT PRIMARY KEY,
    url         TEXT NOT NULL,
    title       TEXT,
    thumbnail   TEXT,
    quality     TEXT NOT NULL,
    status      TEXT NOT NULL,
    progress    REAL NOT NULL DEFAULT 0,
    bytes_done  INTEGER,
    bytes_total INTEGER,
    speed       REAL,
    eta         INTEGER,
    size        INTEGER,
    storage_key TEXT,
    error       TEXT,
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  )
`)
db.run('CREATE INDEX IF NOT EXISTS downloads_created_at ON downloads (created_at DESC)')

type Row = {
  id: string
  url: string
  title: string | null
  thumbnail: string | null
  quality: Quality
  status: DownloadStatus
  progress: number
  bytes_done: number | null
  bytes_total: number | null
  speed: number | null
  eta: number | null
  size: number | null
  storage_key: string | null
  error: string | null
  created_at: string
  updated_at: string
}

function toDownload(row: Row): Download {
  return {
    id: row.id,
    url: row.url,
    title: row.title,
    thumbnail: row.thumbnail,
    quality: row.quality,
    status: row.status,
    progress: row.progress,
    bytesDone: row.bytes_done,
    bytesTotal: row.bytes_total,
    speed: row.speed,
    eta: row.eta,
    size: row.size,
    storageKey: row.storage_key,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

const columns: Record<string, string> = {
  title: 'title',
  thumbnail: 'thumbnail',
  status: 'status',
  progress: 'progress',
  bytesDone: 'bytes_done',
  bytesTotal: 'bytes_total',
  speed: 'speed',
  eta: 'eta',
  size: 'size',
  storageKey: 'storage_key',
  error: 'error',
}

export type DownloadPatch = Partial<
  Pick<
    Download,
    | 'title'
    | 'thumbnail'
    | 'status'
    | 'progress'
    | 'bytesDone'
    | 'bytesTotal'
    | 'speed'
    | 'eta'
    | 'size'
    | 'storageKey'
    | 'error'
  >
>

export function createDownload(url: string, quality: Quality): Download {
  const now = new Date().toISOString()
  const row = db
    .query<Row, Record<string, string>>(
      `INSERT INTO downloads (id, url, quality, status, created_at, updated_at)
       VALUES ($id, $url, $quality, 'queued', $now, $now)
       RETURNING *`,
    )
    .get({ id: crypto.randomUUID(), url, quality, now })!
  return toDownload(row)
}

export function getDownload(id: string): Download | null {
  const row = db.query<Row, [string]>('SELECT * FROM downloads WHERE id = ?').get(id)
  return row ? toDownload(row) : null
}

export function listDownloads(filter: { status?: 'active' | 'done' | 'failed'; q?: string } = {}) {
  const where: string[] = []
  const params: Record<string, string> = {}
  if (filter.status === 'active') where.push(`status IN ('queued', 'downloading', 'uploading')`)
  else if (filter.status) {
    where.push('status = $status')
    params.status = filter.status
  }
  if (filter.q) {
    where.push(`title LIKE $q ESCAPE '\\'`)
    params.q = `%${filter.q.replace(/[\\%_]/g, (c) => `\\${c}`)}%`
  }
  const sql = `SELECT * FROM downloads ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY created_at DESC`
  return db.query<Row, Record<string, string>>(sql).all(params).map(toDownload)
}

export function updateDownload(id: string, patch: DownloadPatch): Download | null {
  const sets: string[] = []
  const params: Record<string, string | number | null> = { id, now: new Date().toISOString() }
  for (const [key, value] of Object.entries(patch)) {
    const column = columns[key]
    if (!column || value === undefined) continue
    sets.push(`${column} = $${key}`)
    params[key] = value as string | number | null
  }
  if (!sets.length) return getDownload(id)
  const row = db
    .query<Row, typeof params>(
      `UPDATE downloads SET ${sets.join(', ')}, updated_at = $now WHERE id = $id RETURNING *`,
    )
    .get(params)
  return row ? toDownload(row) : null
}

export function deleteDownload(id: string) {
  db.query('DELETE FROM downloads WHERE id = ?').run(id)
}

export function getStats(): Stats {
  return db
    .query<Stats, []>(
      `SELECT
         COUNT(*) FILTER (WHERE status = 'done')        AS totalDownloads,
         COALESCE(SUM(size) FILTER (WHERE status = 'done'), 0) AS storageUsed,
         COUNT(*) FILTER (WHERE status IN ('downloading', 'uploading')) AS inProgress,
         COUNT(*) FILTER (WHERE status = 'queued')      AS queued,
         COUNT(*) FILTER (WHERE status = 'failed')      AS failed
       FROM downloads`,
    )
    .get()!
}

/**
 * Called once at startup. Jobs that were mid-flight when the server stopped
 * can't be resumed, so they're marked failed. Returns queued ids to re-queue.
 */
export function recoverAfterRestart(): string[] {
  db.query(
    `UPDATE downloads SET status = 'failed', error = 'Interrupted by server restart', updated_at = ?
     WHERE status IN ('downloading', 'uploading')`,
  ).run(new Date().toISOString())
  return db
    .query<{ id: string }, []>(`SELECT id FROM downloads WHERE status = 'queued' ORDER BY created_at`)
    .all()
    .map((r) => r.id)
}
