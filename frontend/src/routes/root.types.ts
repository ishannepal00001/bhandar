// routes: types for the root route
// RouterContext: Handed to every route's loader, so loaders can fill the same cache the hooks read.
import type { QueryClient } from '@tanstack/react-query'

export type RouterContext = {
  queryClient: QueryClient
}
