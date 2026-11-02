// isQueuedExport(): Still rendering on fetchr.
// exportTitle(): The source download's title, or "Clip" when it had none.
// exportSeconds(): The rendered video's length, the clips' lengths added up.
import type { Export } from '../types/exports'

export const isQueuedExport = (item: Export) => item.status === 'queued'

export function exportTitle(item: Export): string {
  return item.title || 'Clip'
}

export function exportSeconds(item: Export): number {
  return item.clips.reduce((sum, clip) => sum + clip.end - clip.start, 0)
}
