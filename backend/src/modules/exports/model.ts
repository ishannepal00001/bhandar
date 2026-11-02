// exports: db queries on the BHANDAR_DB D1 binding; tables are created by migrations/
// insertExport(): Ignores a repeat insert, so a retried alarm can't store the same export twice.
// fromRow(): clips and caption are stored as JSON text.
import { env } from 'cloudflare:workers'
import type { Export, ExportRow } from './model.types'
import { ExportsModelError } from './model.error'

async function query<T>(message: string, run: () => Promise<T>): Promise<T> {
  try {
    return await run()
  } catch (err) {
    throw new ExportsModelError(message, { cause: err })
  }
}

function fromRow(row: ExportRow): Export {
  return { ...row, clips: JSON.parse(row.clips), caption: row.caption === null ? null : JSON.parse(row.caption) }
}

export function insertExport(item: Export): Promise<void> {
  return query('Failed to save export', async () => {
    await env.BHANDAR_DB.prepare(
      'INSERT INTO exports (id, user_id, download_id, upload_id, title, clips, caption, status, filename, content_type, ' +
        'filesize, thumbnail, error, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ' +
        'ON CONFLICT(id) DO NOTHING',
    )
      .bind(
        item.id,
        item.user_id,
        item.download_id,
        item.upload_id,
        item.title,
        JSON.stringify(item.clips),
        item.caption === null ? null : JSON.stringify(item.caption),
        item.status,
        item.filename,
        item.content_type,
        item.filesize,
        item.thumbnail,
        item.error,
        item.created_at,
        item.updated_at,
      )
      .run()
  })
}

export function listExports(userId: number): Promise<Export[]> {
  return query('Failed to list exports', async () => {
    const { results } = await env.BHANDAR_DB.prepare('SELECT * FROM exports WHERE user_id = ? ORDER BY created_at DESC')
      .bind(userId)
      .all<ExportRow>()
    return results.map(fromRow)
  })
}

export function findExport(userId: number, id: string): Promise<Export | undefined> {
  return query('Failed to look up export', async () => {
    const row = await env.BHANDAR_DB.prepare('SELECT * FROM exports WHERE user_id = ? AND id = ?')
      .bind(userId, id)
      .first<ExportRow>()
    return row ? fromRow(row) : undefined
  })
}

export function countExportsOfUpload(uploadId: string): Promise<number> {
  return query('Failed to look up export', async () => {
    const row = await env.BHANDAR_DB.prepare('SELECT COUNT(*) AS count FROM exports WHERE upload_id = ?')
      .bind(uploadId)
      .first<{ count: number }>()
    return row?.count ?? 0
  })
}

export function deleteExport(userId: number, id: string): Promise<boolean> {
  return query('Failed to delete export', async () => {
    const { meta } = await env.BHANDAR_DB.prepare('DELETE FROM exports WHERE user_id = ? AND id = ?').bind(userId, id).run()
    return meta.changes > 0
  })
}
