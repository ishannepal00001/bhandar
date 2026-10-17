import { Hono } from 'hono'
import { z } from 'zod'
import { createDownload, deleteDownload, getDownload, listDownloads } from '../db'
import { publish } from '../events'
import { isFacebookUrl } from '../facebook'
import { cancel, enqueue, isActive } from '../queue'
import { deleteFile, presignedUrl } from '../storage'
import { qualities } from '../types'
import { validate } from './validate'

const createSchema = z.object({
  url: z
    .string({ error: 'url is required' })
    .trim()
    .refine(isFacebookUrl, 'That doesn’t look like a Facebook video link'),
  quality: z.enum(qualities).default('hd'),
})

const listSchema = z.object({
  status: z.enum(['active', 'done', 'failed']).optional(),
  q: z.string().trim().max(200).optional(),
})

/** Turns a video title into a safe file name for the browser's save dialog. */
function fileName(title: string | null, key: string) {
  const ext = key.split('.').pop()
  const base = (title ?? 'video')
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120)
  return `${base || 'video'}.${ext}`
}

export const downloads = new Hono()
  .post('/', validate('json', createSchema), (c) => {
    const { url, quality } = c.req.valid('json')
    const download = createDownload(url, quality)
    publish({ type: 'created', download })
    enqueue(download.id)
    return c.json(download, 201)
  })

  .get('/', validate('query', listSchema), (c) => {
    return c.json(listDownloads(c.req.valid('query')))
  })

  .get('/:id', (c) => {
    const download = getDownload(c.req.param('id'))
    if (!download) return c.json({ error: 'Download not found' }, 404)
    return c.json(download)
  })

  .get('/:id/file', (c) => {
    const download = getDownload(c.req.param('id'))
    if (!download) return c.json({ error: 'Download not found' }, 404)
    if (download.status !== 'done' || !download.storageKey) {
      return c.json({ error: 'This download isn’t finished yet' }, 409)
    }
    const save = c.req.query('download') !== undefined
    const url = presignedUrl(
      download.storageKey,
      save ? fileName(download.title, download.storageKey) : undefined,
    )
    return c.redirect(url, 302)
  })

  .delete('/:id', async (c) => {
    const id = c.req.param('id')
    const download = getDownload(id)
    if (!download) return c.json({ error: 'Download not found' }, 404)

    // Active jobs are cancelled first; the record stays with status "cancelled".
    if (isActive(id)) {
      cancel(id)
      return c.json({ status: 'cancelling' }, 202)
    }

    if (download.storageKey) await deleteFile(download.storageKey)
    deleteDownload(id)
    publish({ type: 'deleted', id })
    return c.body(null, 204)
  })
