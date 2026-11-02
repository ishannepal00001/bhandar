// uploads: db queries on the BHANDAR_DB D1 binding; tables are created by migrations/
// listStaleUnused(): Uploads created before the cutoff that no finished export uses. Queued exports live in the
//   DownloadTracker, so the caller still has to check those.
import { env } from 'cloudflare:workers'
import type { Upload } from './model.types'
import { UploadsModelError } from './model.error'

async function query<T>(message: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    throw new UploadsModelError(message, { cause: err })
  }
}

export function insertUpload(upload: Upload): Promise<void> {
  return query('Failed to save upload', async () => {
    await env.BHANDAR_DB.prepare(
      'INSERT INTO uploads (id, user_id, name, filename, content_type, size, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    )
      .bind(
        upload.id,
        upload.user_id,
        upload.name,
        upload.filename,
        upload.content_type,
        upload.size,
        upload.status,
        upload.created_at,
      )
      .run()
  })
}

export function findUpload(userId: number, id: string): Promise<Upload | undefined> {
  return query('Failed to look up upload', async () => {
    const upload = await env.BHANDAR_DB.prepare('SELECT * FROM uploads WHERE user_id = ? AND id = ?')
      .bind(userId, id)
      .first<Upload>()
    return upload ?? undefined
  })
}

export function markReady(userId: number, id: string): Promise<void> {
  return query('Failed to update upload', async () => {
    await env.BHANDAR_DB.prepare("UPDATE uploads SET status = 'ready' WHERE user_id = ? AND id = ?").bind(userId, id).run()
  })
}

export function deleteUpload(id: string): Promise<void> {
  return query('Failed to delete upload', async () => {
    await env.BHANDAR_DB.prepare('DELETE FROM uploads WHERE id = ?').bind(id).run()
  })
}

export function listStaleUnused(cutoff: string): Promise<Upload[]> {
  return query('Failed to list stale uploads', async () => {
    const { results } = await env.BHANDAR_DB.prepare(
      'SELECT * FROM uploads WHERE created_at < ? AND NOT EXISTS (SELECT 1 FROM exports WHERE exports.upload_id = uploads.id)',
    )
      .bind(cutoff)
      .all<Upload>()
    return results
  })
}
