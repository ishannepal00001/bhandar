import { createRoute } from '@tanstack/react-router'
import DownloadsPage from '../pages/Downloads'
import { layoutRoute } from './Layout'

export const downloadsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/downloads',
  component: DownloadsPage,
})
