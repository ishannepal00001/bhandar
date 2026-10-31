// hooks: POST /auth/login; trades the emailed code for the auth cookie
import { useMutation } from '@tanstack/react-query'
import type { LoginRequest, LoginResult } from '../../types/auth'
import { notifyError, notifySuccess } from '../notify'
import { request } from '../request'

export function useLogin() {
  return useMutation({
    mutationFn: (input: LoginRequest) => request<LoginResult>('/auth/login', { method: 'POST', body: input }),
    onSuccess: () => notifySuccess('Logged in'),
    onError: notifyError,
  })
}
