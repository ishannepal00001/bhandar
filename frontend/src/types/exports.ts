// Exports as the Worker returns them (backend/API.md, Exports): clips from one download joined into one MP4 by fetchr.
// ExportRequest: The body of POST /exports. hold and fade come from config.editor.caption, so the render fades like the
//   editor's preview.
// FinishedExport.thumbnail_url: A signed link from GET /exports; absent on SSE events.
import type { FinalStatus } from './downloads'

export type ExportClip = { start: number; end: number }

export type ExportCaption = { headline: string; details: string; hold: number; fade: number }

export type ExportRequest = {
  download_id: string
  clips: ExportClip[]
  caption: ExportCaption | null
}

type ExportSpec = {
  id: string
  download_id: string
  title: string | null
  clips: ExportClip[]
  caption: ExportCaption | null
  created_at: string
}

export type QueuedExport = ExportSpec & { status: 'queued' }

export type FinishedExport = ExportSpec & {
  status: FinalStatus
  filename: string | null
  content_type: string | null
  filesize: number | null
  thumbnail: string | null
  thumbnail_url?: string | null
  error: string | null
  updated_at: string
}

export type Export = QueuedExport | FinishedExport
