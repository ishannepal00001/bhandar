import { createRoute } from '@tanstack/react-router'
import { dashboardFacade } from '../facades/dashboard'
import DashboardPage from '../pages/Dashboard'
import { layoutRoute } from './Layout'
import { loadQuery } from './loadQuery'

export const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/',
  loader: ({ context }) => loadQuery(context.queryClient, dashboardFacade.dashboardQuery),
  component: DashboardPage,
})
