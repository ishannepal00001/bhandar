// dashboard: errors for the model

export class DashboardModelError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = 'DashboardModelError'
  }
}
