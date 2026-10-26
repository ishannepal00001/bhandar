// downloads: types for the model
// Download: A row of the downloads table (migrations/0003_downloads.sql).
import type { FinishedJob } from './utils.types'

export type Download = FinishedJob & { user_id: number }
