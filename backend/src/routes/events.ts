import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { listDownloads } from '../db'
import { subscribe } from '../events'

const PING_MS = 15_000

export const events = new Hono().get('/', (c) =>
  streamSSE(c, async (stream) => {
    // Writes are chained so events always reach the client in order.
    let chain = Promise.resolve()
    const send = (event: string, data: unknown) => {
      chain = chain
        .then(() => stream.writeSSE({ event, data: JSON.stringify(data) }))
        .catch(() => {})
    }

    send('snapshot', listDownloads({ status: 'active' }))

    const unsubscribe = subscribe((e) => send(e.type, e))
    const ping = setInterval(() => send('ping', { at: Date.now() }), PING_MS)

    await new Promise<void>((resolve) => stream.onAbort(resolve))
    clearInterval(ping)
    unsubscribe()
  }),
)
