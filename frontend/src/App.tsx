import {
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import Layout from './Layout'
import { Auth } from './routes/Auth'
import { Dashboard } from './routes/Dashboard'
import { Downloads } from './routes/Downloads'

export const rootRoute = createRootRoute({
  component: Layout,
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
