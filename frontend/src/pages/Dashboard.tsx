import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Download,
  HardDrive,
  LoaderCircle,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import DownloadQueue from '../components/Downloads/DownloadQueue'
import HeaderActions from '../components/HeaderActions'
import Marquee from '../components/Marquee'
import VideoCard from '../components/VideoCard'
import { config } from '../config'
import { dashboardFacade } from '../facades/dashboard'
import { muted, panel } from '../styles'
import type { Dashboard } from '../types/dashboard'
import { formatBytes } from '../utils/format'

type Stat = { label: string; value: string; icon: LucideIcon }

const emptyDashboard: Dashboard = {
  stats: { downloads: 0, storage: 0, queued: 0, failed: 0 },
  queued: [],
  recent: [],
}

function DashboardPage() {
  const { data = emptyDashboard } = dashboardFacade.useDashboard()
  const { stats: totals, queued, recent } = data

  const stats: Stat[] = [
    { label: 'Downloads', value: String(totals.downloads), icon: Download },
    { label: 'Storage', value: formatBytes(totals.storage), icon: HardDrive },
    { label: 'Queued', value: String(totals.queued), icon: LoaderCircle },
    { label: 'Failed', value: String(totals.failed), icon: TriangleAlert },
  ]

  return (
    <div className="min-h-screen bg-background text-primary dark:bg-night-background dark:text-night-primary">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <h1 className="font-serif text-3xl">Dashboard</h1>
          <HeaderActions />
        </div>

        <section className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className={panel}>
              {/* Mobile: one full-width row per stat */}
              <div className="flex items-center justify-between gap-4 p-4 sm:hidden">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/15 dark:border-night-primary/15">
                    <Icon size={18} className={muted} />
                  </span>
                  <p className={`min-w-0 text-xs uppercase tracking-widest ${muted}`}>{label}</p>
                </div>
                <p className="shrink-0 font-serif text-2xl tabular-nums">{value}</p>
              </div>

              {/* Larger screens: card grid */}
              <div className="hidden p-5 sm:block">
                <div className="flex items-center justify-between">
                  <p className={`text-xs uppercase tracking-widest ${muted}`}>{label}</p>
                  <Icon size={18} className={muted} />
                </div>
                <p className="mt-2 font-serif text-3xl">{value}</p>
              </div>
            </div>
          ))}
        </section>

        <DownloadQueue items={queued} />

        <section>
          <div className="flex items-center justify-between pb-4">
            <h2 className="font-serif text-xl">Recent Downloads</h2>
            <Link
              to="/downloads"
              className={`flex items-center gap-1 text-sm underline-offset-4 hover:underline ${muted}`}
            >
              View all
              <ArrowRight size={14} />
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className={`text-sm ${muted}`}>No downloads yet.</p>
          ) : recent.length > config.dashboard.marqueeAbove ? (
            <Marquee items={recent} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {recent.map((job) => (
                <VideoCard key={job.id} job={job} actions={false} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default DashboardPage
