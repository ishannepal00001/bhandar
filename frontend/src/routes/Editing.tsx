import { createRoute } from '@tanstack/react-router'
import EditingPage from '../pages/Editing'
import { layoutRoute } from './Layout'

export const editingRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/editing',
  component: EditingPage,
})
