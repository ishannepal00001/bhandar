// hooks: POST /auth/logout; clears the auth cookie
// onSuccess: Drops every cached query, so nothing of the user's is left in memory.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { LogoutResult } from '../../types/auth'
import { request } from '../request'

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => request<LogoutResult>('/auth/logout', { method: 'POST' }),
    onSuccess: () => queryClient.clear(),
  })
}
