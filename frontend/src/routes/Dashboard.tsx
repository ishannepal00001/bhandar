import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '../App'
import DashboardPage from '../pages/Dashboard'

export const Dashboard = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: DashboardPage,
})
