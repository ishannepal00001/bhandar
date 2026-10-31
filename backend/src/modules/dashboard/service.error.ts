// dashboard: errors for the service

export class DashboardServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DashboardServiceError'
  }
}
