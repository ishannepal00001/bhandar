import { createRoute } from '@tanstack/react-router'
import { downloadsFacade } from '../facades/downloads'
import DownloadsPage from '../pages/Downloads'
import { layoutRoute } from './Layout'
import { loadQuery } from './loadQuery'

export const downloadsRoute = createRoute({
  getParentRoute: () => layoutRoute,
  path: '/downloads',
  loader: ({ context }) => loadQuery(context.queryClient, downloadsFacade.downloadsQuery),
  component: DownloadsPage,
})
