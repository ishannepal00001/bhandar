// routes: the route tree; /auth sits outside the layout
import { authRoute } from './Auth'
import { dashboardRoute } from './Dashboard'
import { downloadsRoute } from './Downloads'
import { editingRoute } from './Editing'
import { layoutRoute } from './Layout'
import { rootRoute } from './root'

export const routeTree = rootRoute.addChildren([
  layoutRoute.addChildren([dashboardRoute, downloadsRoute, editingRoute]),
  authRoute,
])
