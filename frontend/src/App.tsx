import {
  createRootRoute,
  createRouter,
  Navigate,
  RouterProvider,
} from '@tanstack/react-router'
import Layout from './Layout'
import { Auth } from './routes/Auth'
import { Dashboard } from './routes/Dashboard'
import { Downloads } from './routes/Downloads'

export const rootRoute = createRootRoute({
  component: Layout,
  // Send any unmatched path back to the index route.
  notFoundComponent: () => <Navigate to="/" replace />,
})

const routeTree = rootRoute.addChildren([Dashboard, Downloads, Auth])

const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function App() {
  return <RouterProvider router={router} />
}

export default App
