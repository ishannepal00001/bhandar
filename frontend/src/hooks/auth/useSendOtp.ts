// hooks: POST /auth/send-otp; checks the password and emails the login code
import { useMutation } from '@tanstack/react-query'
import type { SendOtpRequest, SendOtpResult } from '../../types/auth'
import { request } from '../request'

export function useSendOtp() {
  return useMutation({
    mutationFn: (input: SendOtpRequest) => request<SendOtpResult>('/auth/send-otp', { method: 'POST', body: input }),
  })
}
