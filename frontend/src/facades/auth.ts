// facades: the auth junction; call its hooks as authFacade.useSendOtp()
import { useLogin } from '../hooks/auth/useLogin'
import { useLogout } from '../hooks/auth/useLogout'
import { useSendOtp } from '../hooks/auth/useSendOtp'

export const authFacade = {
  useSendOtp,
  useLogin,
  useLogout,
}
