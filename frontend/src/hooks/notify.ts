// hooks: the toasts the hooks show
// notifyError(): Uses the field's message from a 400 when there is one, like the forms used to.
import { toast } from 'sonner'
import { errorMessage } from '../utils/errors'

export function notifySuccess(message: string): void {
  toast.success(message)
}

export function notifyError(error: Error): void {
  toast.error(errorMessage(error) ?? error.message)
}
