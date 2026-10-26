// downloads: db queries on the BHANDAR_DB D1 binding; tables are created by migrations/
// insertDownload(): Ignores a repeat insert, so a retried alarm can't store the same job twice.
import { env } from 'cloudflare:workers'
import type { Download } from './model.types'
import { DownloadsModelError } from './model.error'

async function query<T>(message: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    throw new DownloadsModelError(message, { cause: err })
  }
}

export function insertDownload(download: Download): Promise<void> {
  return query('Failed to save download', async () => {
    await env.BHANDAR_DB.prepare(
      'INSERT INTO downloads (id, user_id, source_url, status, title, filename, content_type, filesize, error, created_at, updated_at) ' +
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING',
    )
      .bind(
        download.id,
        download.user_id,
        download.source_url,
        download.status,
        download.title,
        download.filename,
        download.content_type,
        download.filesize,
        download.error,
        download.created_at,
        download.updated_at,
      )
      .run()
  })
}

export function listDownloads(userId: number): Promise<Download[]> {
  return query('Failed to list downloads', async () => {
    const { results } = await env.BHANDAR_DB.prepare('SELECT * FROM downloads WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<Download>()
    return results
  })
}

export function findDownload(userId: number, id: string): Promise<Download | undefined> {
  return query('Failed to look up download', async () => {
    const download = await env.BHANDAR_DB.prepare('SELECT * FROM downloads WHERE user_id = ? AND id = ?')
      .bind(userId, id)
      .first<Download>()
    return download ?? undefined
  })
}

export function deleteDownload(userId: number, id: string): Promise<boolean> {
  return query('Failed to delete download', async () => {
    const { meta } = await env.BHANDAR_DB.prepare('DELETE FROM downloads WHERE user_id = ? AND id = ?').bind(userId, id).run()
    return meta.changes > 0
  })
}
