import { createRoute } from '@tanstack/react-router'
import { rootRoute } from '../App'
import DownloadsPage from '../pages/Downloads'

export const Downloads = createRoute({
  getParentRoute: () => rootRoute,
  path: '/downloads',
  component: DownloadsPage,
})
