// ClipSource: The video the clips are cut from. A download is referenced by its id, which the export sends; an upload
//   only has a local file for now, so it can be clipped and previewed but not exported yet.
// Clip.id: Generated in the browser so the clip list can key, reorder and remove rows.
export type ClipSource = { kind: 'download'; downloadId: string; title: string } | { kind: 'upload'; name: string }

export type Clip = {
  id: string
  start: number
  end: number
}
