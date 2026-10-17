export const qualities = ['hd', 'sd', 'audio'] as const
export type Quality = (typeof qualities)[number]

export const statuses = [
  'queued',
  'downloading',
  'uploading',
  'done',
  'failed',
  'cancelled',
] as const
export type DownloadStatus = (typeof statuses)[number]

export const activeStatuses: DownloadStatus[] = ['queued', 'downloading', 'uploading']

export type Download = {
  id: string
  url: string
  title: string | null
  thumbnail: string | null
  quality: Quality
  status: DownloadStatus
  progress: number
  bytesDone: number | null
  bytesTotal: number | null
  speed: number | null
  eta: number | null
  size: number | null
  storageKey: string | null
  error: string | null
  createdAt: string
  updatedAt: string
}

export type Stats = {
  totalDownloads: number
  storageUsed: number
  inProgress: number
  queued: number
  failed: number
}

export type BusEvent =
  | { type: 'created'; download: Download }
  | { type: 'updated'; download: Download }
  | { type: 'progress'; id: string; progress: number; bytesDone: number | null; bytesTotal: number | null; speed: number | null; eta: number | null }
  | { type: 'deleted'; id: string }
