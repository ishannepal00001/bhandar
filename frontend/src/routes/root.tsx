import { createRootRouteWithContext, Navigate, Outlet } from '@tanstack/react-router'
import type { RouterContext } from './root.types'

export const rootRoute = createRootRouteWithContext<RouterContext>()({
  component: Outlet,
  // Send any unmatched path back to the index route.
  notFoundComponent: () => <Navigate to="/" replace />,
})
