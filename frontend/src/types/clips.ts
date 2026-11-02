// ClipSource: The video the clips are cut from. A download is referenced by its id, which the export sends. An upload
//   keeps its local file; it's sent to B2 on the first export, and uploadId is set once that finished, so later exports
//   in the same session reuse it.
// Clip.id: Generated in the browser so the clip list can key, reorder and remove rows.
export type ClipSource =
  | { kind: 'download'; downloadId: string; title: string }
  | { kind: 'upload'; name: string; file: File; uploadId: string | null }

export type Clip = {
  id: string
  start: number
  end: number
}
