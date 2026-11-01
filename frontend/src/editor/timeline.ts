// timeline: maps the source video's playback position onto the exported video, which is the clips joined in order.
// outputTime(): Where `time` lands in the export, or null when it's in none of the clips. The clip being marked counts
//   as the last clip, so the caption previews while the end is still being chosen. Overlapping clips resolve to the
//   first one in the list.
// captionOpacity(): 1 through the hold, then linear down to 0 over the fade, matching the render.
import { config } from '../config'
import type { Clip } from '../types/clips'

export function outputTime(time: number, clips: Clip[], pendingStart: number | null): number | null {
  let offset = 0
  for (const clip of clips) {
    if (time >= clip.start && time < clip.end) return offset + time - clip.start
    offset += clip.end - clip.start
  }
  return pendingStart !== null && time >= pendingStart ? offset + time - pendingStart : null
}

export function totalSeconds(clips: Clip[]): number {
  return clips.reduce((sum, clip) => sum + clip.end - clip.start, 0)
}

export function captionOpacity(elapsed: number): number {
  const { holdSeconds, fadeSeconds } = config.editor.caption
  return Math.min(1, Math.max(0, 1 - (elapsed - holdSeconds) / fadeSeconds))
}
