// exports: types for the fetchr render endpoints and the exports built from their replies
// ExportSpec: What the export asked for. The tracker keeps it with the queued job so the finished row can store it.
//   The source is a download or an upload: exactly one of download_id and upload_id is set.
// RenderRequest: The body of fetchr's POST /api/v1/renders.
// QueuedExport: Any fetchr status that isn't final shows as queued.
// FinishedExport.filename: The B2 object key (renders/<client_id>/<id>/clip.mp4); set when status is completed.
// FinishedExport.thumbnail: The first-frame thumbnail's B2 key; null when fetchr couldn't make one.
// ShownExport: A finished export as the API returns it, with a signed link to its thumbnail.
import type { ExportRequest } from '../../../../schemas/exports'
import type { FinalStatus } from '../downloads/utils.types'

export type ExportClip = ExportRequest['clips'][number]

export type ExportCaption = NonNullable<ExportRequest['caption']>

export type ExportSpec = {
  download_id: string | null
  upload_id: string | null
  title: string | null
  clips: ExportClip[]
  caption: ExportCaption | null
}

export type RenderRequest = {
  source_key: string
  clips: ExportClip[]
  caption: ExportCaption | null
}

export type QueuedExport = ExportSpec & {
  id: string
  status: 'queued'
  created_at: string
}

export type FinishedExport = ExportSpec & {
  id: string
  status: FinalStatus
  filename: string | null
  content_type: string | null
  filesize: number | null
  thumbnail: string | null
  error: string | null
  created_at: string
  updated_at: string
}

export type ShownExport = FinishedExport & { thumbnail_url: string | null }
