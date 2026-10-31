// dashboard: errors for the controller

export class DashboardControllerError extends Error {
  constructor(
    message: string,
    readonly status: 500,
  ) {
    super(message)
    this.name = 'DashboardControllerError'
  }
}
