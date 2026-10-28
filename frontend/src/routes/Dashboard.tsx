import { createRoute } from '@tanstack/react-router'
import DashboardPage from '../pages/Dashboard'
import { layoutRoute } from './Layout'

export const dashboardRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/',
  component: DashboardPage,
})
