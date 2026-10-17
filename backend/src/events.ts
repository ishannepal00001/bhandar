import type { BusEvent } from './types'

type Listener = (event: BusEvent) => void

const listeners = new Set<Listener>()

export function publish(event: BusEvent) {
  for (const listener of listeners) {
    try {
      listener(event)
    } catch (err) {
      console.error('Event listener failed', err)
    }
  }
}

export function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
