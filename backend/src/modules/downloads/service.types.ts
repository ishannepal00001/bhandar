// downloads: types for the service
export type FileLinkResult = { url: string }

export type DeleteResult = { deleted: true }

export type DownloadsServiceErrorKind =
  | 'NOT_FOUND'
  | 'NOT_COMPLETED'
  | 'QUEUE_FULL'
  | 'DOWNLOADER_ERROR'
  | 'STORAGE_ERROR'
  | 'DB_ERROR'
