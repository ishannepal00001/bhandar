// hooks: POST /auth/logout; clears the auth cookie
// onSuccess: Drops every cached query and the copy saved in localStorage, so nothing of the user's is left behind.
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { persister } from '../../queryClient'
import type { LogoutResult } from '../../types/auth'
import { request } from '../request'

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => request<LogoutResult>('/auth/logout', { method: 'POST' }),
    onSuccess: async () => {
      queryClient.clear()
      await persister.removeClient()
    },
  })
}
