// facades: the exports' junction; call its hooks as exportsFacade.useExports()
// exportsQuery: For the route's loader: context.queryClient.ensureQueryData(exportsFacade.exportsQuery).
import { useDeleteExport } from '../hooks/exports/useDeleteExport'
import { useExportEvents } from '../hooks/exports/useExportEvents'
import { exportsQuery, useExports } from '../hooks/exports/useExports'
import { useStartExport } from '../hooks/exports/useStartExport'

export const exportsFacade = {
  exportsQuery,
  useExports,
  useStartExport,
  useDeleteExport,
  useExportEvents,
}
