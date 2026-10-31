// Toaster: Unstyled, so the toasts take the app's three colours and square corners instead of sonner's own look.
import { RouterProvider } from '@tanstack/react-router'
import { Toaster } from 'sonner'
import { router } from './router'

const toastClassNames = {
  toast:
    'flex w-full items-start gap-3 border border-primary/15 bg-background p-4 text-sm text-primary shadow-sm dark:border-night-primary/15 dark:bg-night-background dark:text-night-primary',
  title: 'font-medium',
  description: 'mt-1 text-xs text-primary/60 dark:text-night-primary/60',
  icon: 'mt-0.5 shrink-0',
  success: 'border-l-4 border-l-primary dark:border-l-night-primary',
  error: 'border-l-4 border-l-accent dark:border-l-night-accent',
}

function App() {
  return (
    <>
      <RouterProvider router={router} />
      <Toaster position="bottom-right" toastOptions={{ unstyled: true, classNames: toastClassNames }} />
    </>
  )
}

export default App
