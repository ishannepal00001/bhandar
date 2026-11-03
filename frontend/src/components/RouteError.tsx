// Shown in place of a page whose loader or render failed (e.g. the backend is down), as a full page with the text
//   centred. While it's mounted, Layout hides the sidebar and header; useLayoutEffect flips that before the first paint,
//   so the sidebar never flashes.
// message: Errors from the backend (ApiError) are written for people; anything else is a bug in the page whose text
//   (e.g. "Cannot read properties of null") would only confuse, so it's logged and replaced with a plain sentence.
// Try again: Re-runs the loaders, so the page shows up as soon as the backend answers.
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { useLayoutEffect } from 'react'
import { TriangleAlert } from 'lucide-react'
import { ApiError } from '../hooks/request.error'
import { useErrorPageStore } from '../stores/useErrorPageStore'
import { muted } from '../styles'
import { errorMessage } from '../utils/errors'

function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()
  const setShown = useErrorPageStore((state) => state.setShown)
  useLayoutEffect(() => {
    setShown(true)
    return () => setShown(false)
  }, [setShown])
  if (!(error instanceof ApiError)) console.error(error)
  const message =
    error instanceof ApiError
      ? errorMessage(error)
      : 'Something went wrong while showing this page. Try again, and if it keeps happening, reload the page.'

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6 sm:py-8">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2">
          <TriangleAlert size={18} className="text-accent dark:text-night-accent" />
          <h1 className="font-serif text-xl">Couldn’t load this page</h1>
        </div>
        <p className={`text-sm ${muted}`}>{message}</p>
        <button
          type="button"
          onClick={() => void router.invalidate()}
          className="bg-primary px-6 py-2.5 text-sm text-background hover:bg-primary/90 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary/90"
        >
          Try again
        </button>
      </div>
    </main>
  )
}

export default RouteError
