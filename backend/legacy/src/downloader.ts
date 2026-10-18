import { mkdir, readdir, rm } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { updateDownload } from './db'
import { env } from './env'
import { publish } from './events'
import { parseProgressLine, progressTemplate } from './progress'
import { deleteFile, uploadFile } from './storage'
import type { Quality } from './types'

const formatArgs: Record<Quality, string[]> = {
  hd: ['-f', 'bv*+ba/b', '--merge-output-format', 'mp4'],
  sd: ['-f', 'bv*[height<=480]+ba/b[height<=480]/b', '--merge-output-format', 'mp4'],
  audio: ['-f', 'ba/b', '-x', '--audio-format', 'mp3'],
}

const META_PREFIX = 'bhandar-meta:'

export class CancelledError extends Error {
  constructor() {
    super('Cancelled')
  }
}

function update(id: string, patch: Parameters<typeof updateDownload>[1]) {
  const download = updateDownload(id, patch)
  if (download) publish({ type: 'updated', download })
  return download
}

/** Splits a byte stream into lines and calls `onLine` for each one. */
async function readLines(stream: ReadableStream<Uint8Array>, onLine: (line: string) => void) {
  const decoder = new TextDecoder()
  let buffer = ''
  for await (const chunk of stream) {
    buffer += decoder.decode(chunk, { stream: true })
    let index: number
    while ((index = buffer.search(/\r?\n|\r/)) !== -1) {
      onLine(buffer.slice(0, index))
      buffer = buffer.slice(index + (buffer[index] === '\r' && buffer[index + 1] === '\n' ? 2 : 1))
    }
  }
  if (buffer) onLine(buffer)
}

/** Picks the finished file yt-dlp left in the job folder (ignores partial/temp files). */
async function findOutput(dir: string) {
  const files = (await readdir(dir)).filter(
    (f) => !f.endsWith('.part') && !f.endsWith('.ytdl') && !f.includes('.temp.'),
  )
  if (!files.length) throw new Error('yt-dlp finished but produced no file')
  const sized = await Promise.all(
    files.map(async (f) => ({ path: join(dir, f), size: Bun.file(join(dir, f)).size })),
  )
  return sized.sort((a, b) => b.size - a.size)[0]
}

/**
 * Downloads one video with yt-dlp, uploads it to B2 and records the result.
 * Throws CancelledError if `signal` is aborted.
 */
export async function runDownload(id: string, url: string, quality: Quality, signal: AbortSignal) {
  const dir = join(env.DATA_DIR, 'tmp', id)
  await mkdir(dir, { recursive: true })

  try {
    update(id, { status: 'downloading', progress: 0, error: null })

    const proc = Bun.spawn(
      [
        'yt-dlp',
        ...formatArgs[quality],
        '--no-playlist',
        '--no-warnings',
        '--newline',
        '--no-simulate',
        '--progress',
        '--progress-template',
        progressTemplate,
        '--print',
        `before_dl:${META_PREFIX}%(.{title,thumbnail})j`,
        '-o',
        join(dir, 'video.%(ext)s'),
        '--',
        url,
      ],
      { stdout: 'pipe', stderr: 'pipe' },
    )

    const kill = () => proc.kill()
    signal.addEventListener('abort', kill, { once: true })

    const stderrTail: string[] = []
    let lastWrite = 0

    await Promise.all([
      readLines(proc.stdout, (line) => {
        const meta = line.indexOf(META_PREFIX)
        if (meta !== -1) {
          try {
            const { title, thumbnail } = JSON.parse(line.slice(meta + META_PREFIX.length))
            update(id, { title: title ?? null, thumbnail: thumbnail ?? null })
          } catch {
            // Ignore malformed metadata; the download can still succeed.
          }
          return
        }

        const p = parseProgressLine(line)
        if (!p || p.progress === null) return
        const event = {
          type: 'progress' as const,
          id,
          progress: p.progress,
          bytesDone: p.bytesDone,
          bytesTotal: p.bytesTotal,
          speed: p.speed,
          eta: p.eta,
        }
        publish(event)
        // Keep SQLite writes to about one per second per job.
        const now = Date.now()
        if (now - lastWrite > 1000 || p.status === 'finished') {
          lastWrite = now
          updateDownload(id, {
            progress: p.progress,
            bytesDone: p.bytesDone,
            bytesTotal: p.bytesTotal,
            speed: p.speed,
            eta: p.eta,
          })
        }
      }),
      readLines(proc.stderr, (line) => {
        if (!line.trim()) return
        stderrTail.push(line)
        if (stderrTail.length > 20) stderrTail.shift()
      }),
    ])

    const exitCode = await proc.exited
    signal.removeEventListener('abort', kill)
    if (signal.aborted) throw new CancelledError()
    if (exitCode !== 0) {
      const errors = stderrTail
        .filter((l) => l.startsWith('ERROR'))
        .map((l) => l.replace(/^ERROR:\s*/, '').replace(/;?\s*please report this issue.*$/i, '').trim())
      const message = errors.join('\n') || stderrTail.join('\n')
      throw new Error(message || `yt-dlp exited with code ${exitCode}`)
    }

    const output = await findOutput(dir)
    const key = `videos/${id}${extname(output.path)}`

    update(id, { status: 'uploading', progress: 100, speed: null, eta: null })
    await uploadFile(key, output.path)
    if (signal.aborted) {
      // The upload can't be interrupted, so remove it if a cancel came in meanwhile.
      await deleteFile(key).catch(() => {})
      throw new CancelledError()
    }

    update(id, { status: 'done', storageKey: key, size: output.size, bytesDone: output.size, bytesTotal: output.size })
  } finally {
    await rm(dir, { recursive: true, force: true })
  }
}
