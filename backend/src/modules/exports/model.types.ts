// exports: types for the model
// Export: A finished export with its owner, as the model takes and returns it.
// ExportRow: A row of the exports table (migrations/0005_exports.sql) as D1 returns it; clips and caption are JSON text.
import type { FinishedExport } from './utils.types'

export type Export = FinishedExport & { user_id: number }

export type ExportRow = Omit<Export, 'clips' | 'caption'> & {
  clips: string
  caption: string | null
}
