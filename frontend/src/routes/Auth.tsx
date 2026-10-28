import { createRoute } from '@tanstack/react-router'
import AuthPage from '../pages/Auth'
import { rootRoute } from './root'

export const authRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: AuthPage,
})
