// dashboard: request handling
import * as dashboardService from './service'
import { DashboardServiceError } from './service.error'
import type { Dashboard } from './service.types'
import { DashboardControllerError } from './controller.error'

export async function get(userId: number): Promise<Dashboard> {
  try {
    return await dashboardService.get(userId)
  } catch (err) {
    if (!(err instanceof DashboardServiceError)) throw err
    throw new DashboardControllerError(err.message, 500)
  }
}
