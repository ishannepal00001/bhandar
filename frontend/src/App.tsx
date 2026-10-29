import { createRouter, RouterProvider } from '@tanstack/react-router'
import { authRoute } from './routes/Auth'
import { dashboardRoute } from './routes/Dashboard'
import { downloadsRoute } from './routes/Downloads'
import { editingRoute } from './routes/Editing'
import { layoutRoute } from './routes/Layout'
import { rootRoute } from './routes/root'

const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([dashboardRoute, downloadsRoute, editingRoute]),
  authRoute,
])

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
