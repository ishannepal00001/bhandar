import {
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import Layout from './Layout'
import { Dashboard } from './routes/Dashboard'
import { Downloads } from './routes/Downloads'

export const rootRoute = createRootRoute({
  component: Layout,
})

const routeTree = rootRoute.addChildren([Dashboard, Downloads])

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
