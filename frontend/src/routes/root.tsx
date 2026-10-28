import { createRootRoute, Navigate, Outlet } from '@tanstack/react-router'

export const rootRoute = createRootRoute({
  component: Outlet,
  // Send any unmatched path back to the index route.
  notFoundComponent: () => <Navigate to="/" replace />,
})
