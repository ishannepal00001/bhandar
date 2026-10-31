// dashboard: types for the model
// Totals: Counts over the downloads table (migrations/0003_downloads.sql); failed covers failed and cancelled.
export type Totals = {
  downloads: number
  storage: number
  failed: number
}
