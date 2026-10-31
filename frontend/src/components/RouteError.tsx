// Shown in place of a page whose loader failed (e.g. the backend is down); the sidebar stays.
// Try again: Re-runs the loaders, so the page shows up as soon as the backend answers.
import { useRouter, type ErrorComponentProps } from '@tanstack/react-router'
import { TriangleAlert } from 'lucide-react'
import { muted, panel } from '../styles'

function RouteError({ error }: ErrorComponentProps) {
  const router = useRouter()

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className={`${panel} flex flex-col items-start gap-4 p-5`}>
        <div className="flex items-center gap-2">
          <TriangleAlert size={18} className="text-accent dark:text-night-accent" />
          <h1 className="font-serif text-xl">Couldn’t load this page</h1>
        </div>
        <p className={`text-sm ${muted}`}>{error instanceof Error ? error.message : 'Something went wrong'}</p>
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
