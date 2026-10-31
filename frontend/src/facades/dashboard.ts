// facades: the dashboard's junction; call its hooks and store functions as dashboardFacade.useDashboard()
// dashboardQuery: For the route's loader: context.queryClient.ensureQueryData(dashboardFacade.dashboardQuery).
// useDashboardStore: Read lastSeenAt with dashboardFacade.useDashboardStore((state) => state.lastSeenAt).
// markSeen: Taken once from the store; zustand actions never change, so it's safe to call anywhere.
import { dashboardQuery, useDashboard } from '../hooks/dashboard/useDashboard'
import { useDashboardStore } from '../stores/useDashboardStore'

const { markSeen } = useDashboardStore.getState()

export const dashboardFacade = {
  dashboardQuery,
  useDashboard,
  useDashboardStore,
  markSeen,
}
