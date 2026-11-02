// Clip state the server doesn't own yet: what the export will render. One source video, its clips in output order, the
//   start of the clip being marked, and the caption. Not persisted: the video's link is an object URL or a short-lived
//   B2 link, so the clips wouldn't outlive it.
// setSource(): Opening a video starts over, so clips from another video can't leak into its export.
// endClip(): Adds the clip only if it's at least config.editor.minClipSeconds long and returns whether it did; the
//   pending start stays set when it's refused, so the end can be marked again.
// moveClip(): by is -1 (earlier) or 1 (later); moving past either end is ignored.
// setUploadId(): Records that an upload source reached B2; ignored if the source has changed since.
import { create } from 'zustand'
import type { HeadlineFormValues } from '../components/Editor/HeadlineForm.types'
import { config } from '../config'
import type { Clip, ClipSource } from '../types/clips'

type ClipState = {
  source: ClipSource | null
  clips: Clip[]
  pendingStart: number | null
  caption: HeadlineFormValues | null
  setSource: (source: ClipSource | null) => void
  setUploadId: (file: File, uploadId: string) => void
  setCaption: (caption: HeadlineFormValues | null) => void
  startClip: (time: number) => void
  endClip: (time: number) => boolean
  cancelClip: () => void
  removeClip: (id: string) => void
  moveClip: (id: string, by: -1 | 1) => void
  reset: () => void
}

const empty = { source: null, clips: [], pendingStart: null, caption: null }

export const useClipStore = create<ClipState>()((set, get) => ({
  ...empty,
  setSource: (source) => set({ ...empty, source }),
  setUploadId: (file, uploadId) => {
    const { source } = get()
    if (source?.kind === 'upload' && source.file === file) set({ source: { ...source, uploadId } })
  },
  setCaption: (caption) => set({ caption }),
  startClip: (time) => set({ pendingStart: time }),
  endClip: (time) => {
    const { pendingStart, clips } = get()
    if (pendingStart === null || time - pendingStart < config.editor.minClipSeconds) return false
    set({ clips: [...clips, { id: crypto.randomUUID(), start: pendingStart, end: time }], pendingStart: null })
    return true
  },
  cancelClip: () => set({ pendingStart: null }),
  removeClip: (id) => set({ clips: get().clips.filter((clip) => clip.id !== id) }),
  moveClip: (id, by) => {
    const clips = [...get().clips]
    const from = clips.findIndex((clip) => clip.id === id)
    const to = from + by
    if (from < 0 || to < 0 || to >= clips.length) return
    ;[clips[from], clips[to]] = [clips[to], clips[from]]
    set({ clips })
  },
  reset: () => set(empty),
}))
