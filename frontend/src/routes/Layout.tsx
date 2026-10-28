import { createRoute } from '@tanstack/react-router'
import Layout from '../Layout'
import { rootRoute } from './root'

// Pathless: wraps the app pages in the sidebar and header; /auth sits outside it.
export const layoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  id: 'app',
  component: Layout,
})
