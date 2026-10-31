// The app's router, and the one place a 401 sends the user to /auth
// router: Its context hands the queryClient to every route's loader. defaultErrorComponent catches a failed loader per
//   route, so it renders inside the layout and the sidebar stays.
// isUnauthorized(): A 401 from the backend means the cookie is missing or expired.
// toAuth(): Any query or mutation that gets a 401, wherever it ran (a page's refetch, the SSE refetch, a button), ends
//   the session: go to /auth, then drop the cached data and its localStorage copy. Skipped on /auth itself, where a
//   401 is just a wrong password or code.
import { createRouter } from '@tanstack/react-router'
import RouteError from './components/RouteError'
import { ApiError } from './hooks/request.error'
import { persister, queryClient } from './queryClient'
import { routeTree } from './routes/tree'

export const router = createRouter({ routeTree, context: { queryClient }, defaultErrorComponent: RouteError })

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

async function toAuth(): Promise<void> {
  if (router.state.location.pathname === '/auth') return
  await router.navigate({ to: '/auth', replace: true })
  queryClient.clear()
  await persister.removeClient()
}

queryClient.getQueryCache().subscribe((event) => {
  if (event.type === 'updated' && event.action.type === 'error' && isUnauthorized(event.action.error)) void toAuth()
})

queryClient.getMutationCache().subscribe((event) => {
  if (event.type === 'updated' && event.action.type === 'error' && isUnauthorized(event.action.error)) void toAuth()
})
