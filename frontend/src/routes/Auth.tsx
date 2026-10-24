import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '../App'
import AuthPage from '../pages/Auth'

export const Auth = createRoute({
  getParentRoute: () => rootRoute,
  path: '/auth',
  component: AuthPage,
})
