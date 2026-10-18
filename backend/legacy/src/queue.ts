import { getDownload, updateDownload } from './db'
import { CancelledError, runDownload } from './downloader'
import { env } from './env'
import { publish } from './events'

const pending: string[] = []
const running = new Map<string, AbortController>()

function setStatus(id: string, patch: Parameters<typeof updateDownload>[1]) {
  const download = updateDownload(id, patch)
  if (download) publish({ type: 'updated', download })
}

async function run(id: string) {
  const download = getDownload(id)
  if (!download || download.status !== 'queued') return

  const controller = new AbortController()
  running.set(id, controller)
  try {
    await runDownload(id, download.url, download.quality, controller.signal)
  } catch (err) {
    if (err instanceof CancelledError) {
      setStatus(id, { status: 'cancelled', speed: null, eta: null })
    } else {
      // B2 errors arrive as XML text, so undo its entity escaping.
      const message = (err instanceof Error ? err.message : String(err))
        .replace(/&apos;/g, "'")
        .replace(/&quot;/g, '"')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
      console.error(`Download ${id} failed:`, message)
      setStatus(id, { status: 'failed', error: message.slice(0, 2000), speed: null, eta: null })
    }
  } finally {
    running.delete(id)
    pump()
  }
}

function pump() {
  while (running.size < env.MAX_CONCURRENT && pending.length) {
    void run(pending.shift()!)
  }
}

export function enqueue(id: string) {
  pending.push(id)
  pump()
}

/** Stops a queued or running job. Returns false if it wasn't active. */
export function cancel(id: string): boolean {
  const index = pending.indexOf(id)
  if (index !== -1) {
    pending.splice(index, 1)
    setStatus(id, { status: 'cancelled' })
    return true
  }
  const controller = running.get(id)
  if (controller) {
    controller.abort()
    return true
  }
  return false
}

export function isActive(id: string) {
  return pending.includes(id) || running.has(id)
}
