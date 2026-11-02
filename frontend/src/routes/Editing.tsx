import { createRoute } from '@tanstack/react-router'
import { exportsFacade } from '../facades/exports'
import EditingPage from '../pages/Editing'
import { layoutRoute } from './Layout'
import { loadQuery } from './loadQuery'

export const editingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/editing',
  loader: ({ context }) => loadQuery(context.queryClient, exportsFacade.exportsQuery),
  component: EditingPage,
})
