import { Outlet } from '@tanstack/react-router'
import { Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import { useSidebarStore } from './stores/useSidebarStore'

function Layout() {
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen)

  return (
    <div className="flex min-h-screen bg-background text-primary dark:bg-night-background dark:text-night-primary">
      <Sidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-primary/15 bg-background px-4 py-3 md:hidden dark:border-night-primary/15 dark:bg-night-background">
          <p className="font-serif text-xl font-bold">Bhandar</p>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="text-primary/60 hover:text-primary dark:text-night-primary/60 dark:hover:text-night-primary"
          >
            <Menu size={22} />
          </button>
        </header>
        <Outlet />
      </div>
    </div>
  )
}

export default Layout
