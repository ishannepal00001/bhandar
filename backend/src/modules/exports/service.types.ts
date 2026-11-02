// exports: types for the service
export type FileLinkResult = { url: string }

export type DeleteResult = { deleted: true }

export type ExportsServiceErrorKind =
  | 'NOT_FOUND'
  | 'NOT_COMPLETED'
  | 'QUEUE_FULL'
  | 'RENDERER_ERROR'
  | 'STORAGE_ERROR'
  | 'DB_ERROR'
