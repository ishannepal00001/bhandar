// errorMessage(): A 400 names the bad field in issues; show that message over the generic "Invalid request".
import { ApiError } from '../hooks/request.error'

export function errorMessage(error: Error | null): string | null {
  if (!error) return null
  const issue = error instanceof ApiError ? Object.values(error.issues ?? {})[0]?.[0] : undefined
  return issue ?? error.message
}
