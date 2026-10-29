import { Link } from '@tanstack/react-router'
import {
  ArrowLeft,
  Download,
  History,
  LayoutDashboard,
  Scissors,
  Settings,
  X,
} from 'lucide-react'
import { useEffect } from 'react'
import { useMediaQuery } from '../hooks/useMediaQuery'
import { useDownloadModalStore } from '../stores/useDownloadModalStore'
import { useSidebarStore } from '../stores/useSidebarStore'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/downloads', label: 'Downloads', icon: Download },
  { to: '/editing', label: 'Editing', icon: Scissors },
] as const

const upcoming = [{ label: 'History', icon: History }]

const item =
  'flex items-center gap-3 border-l-2 text-sm transition-colors'
const idle =
  'border-transparent text-primary/60 hover:border-primary/30 hover:text-primary dark:text-night-primary/60 dark:hover:border-night-primary/30 dark:hover:text-night-primary'
const iconButton =
  'text-primary/60 hover:text-primary dark:text-night-primary/60 dark:hover:text-night-primary'

function Sidebar() {
  const collapsedSetting = useSidebarStore((state) => state.collapsed)
  const toggle = useSidebarStore((state) => state.toggle)
  const mobileOpen = useSidebarStore((state) => state.mobileOpen)
  const setMobileOpen = useSidebarStore((state) => state.setMobileOpen)
  const openDownloadModal = useDownloadModalStore((state) => state.setOpen)
  const isDesktop = useMediaQuery('(min-width: 768px)')

  // The drawer on small screens is always shown expanded.
  const collapsed = collapsedSetting && isDesktop
  const close = () => setMobileOpen(false)

  useEffect(() => {
    if (isDesktop) setMobileOpen(false)
  }, [isDesktop, setMobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMobileOpen(false)
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobileOpen, setMobileOpen])

  const pad = collapsed ? 'justify-center px-0 py-2' : 'px-5 py-2.5'

  return (
    <>
      {mobileOpen && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={close}
          className="fixed inset-0 z-30 bg-primary/40 md:hidden dark:bg-black/60"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 flex h-screen w-64 shrink-0 flex-col border-r border-primary/15 bg-background transition-[transform,width] duration-200 md:sticky md:top-0 md:z-auto md:translate-x-0 dark:border-night-primary/15 dark:bg-night-background ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'md:w-12' : 'md:w-64'}`}
      >
        <div className={`flex items-start py-6 ${collapsed ? 'justify-center' : 'justify-between px-5'}`}>
          {collapsed ? (
            <p className="font-serif text-2xl font-bold">B</p>
          ) : (
            <div>
              <p className="font-serif text-3xl font-bold">Bhandar</p>
              <p className="mt-1 text-[10px] uppercase tracking-[0.2em] text-accent dark:text-night-accent">
                Facebook Video Downloader
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={close}
            aria-label="Close menu"
            className={`md:hidden ${iconButton}`}
          >
            <X size={20} />
          </button>
        </div>

        <nav className={`flex-1 overflow-y-auto ${collapsed ? 'py-2' : 'py-4'}`}>
          {links.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              onClick={close}
              title={collapsed ? label : undefined}
              className={`${item} ${pad}`}
              activeOptions={{ exact: true }}
              activeProps={{
                className:
                  'border-accent bg-primary/5 font-medium text-primary dark:border-night-accent dark:bg-night-primary/5 dark:text-night-primary',
              }}
              inactiveProps={{ className: idle }}
            >
              <Icon size={18} />
              {!collapsed && label}
            </Link>
          ))}
          {upcoming.map(({ label, icon: Icon }) => (
            <button
              key={label}
              type="button"
              title={collapsed ? label : undefined}
              className={`w-full text-left ${item} ${pad} ${idle}`}
            >
              <Icon size={18} />
              {!collapsed && label}
            </button>
          ))}
        </nav>

        <div className={`pb-4 ${collapsed ? 'flex justify-center' : 'px-5'}`}>
          <button
            type="button"
            onClick={() => {
              close()
              openDownloadModal(true)
            }}
            title={collapsed ? 'Download' : undefined}
            aria-label="Download"
            className={`flex items-center justify-center gap-2 bg-primary text-sm text-background hover:bg-primary/90 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary/90 ${
              collapsed ? 'p-2' : 'w-full px-4 py-2.5'
            }`}
          >
            <Download size={collapsed ? 16 : 18} />
            {!collapsed && 'Download'}
          </button>
        </div>

        <div className={`flex items-center border-t border-primary/15 dark:border-night-primary/15 ${collapsed ? 'flex-col justify-center gap-3 py-3' : 'justify-between px-5 py-4'}`}>
          <button
            type="button"
            title={collapsed ? 'Settings' : undefined}
            className={`flex items-center gap-3 text-left text-sm ${iconButton}`}
          >
            <Settings size={18} />
            {!collapsed && 'Settings'}
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className={`hidden md:block ${iconButton}`}
          >
            <ArrowLeft size={18} className={collapsed ? 'rotate-180' : ''} />
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
