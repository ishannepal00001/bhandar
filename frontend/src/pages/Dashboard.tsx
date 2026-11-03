// Stats: One hairline-ruled strip (gap-px over the border colour), two across on phones and four on wide screens. A
//   stat that needs attention (anything queued or failed) shows its number in the accent colour.
import { Link } from '@tanstack/react-router'
import {
  ArrowRight,
  Download,
  HardDrive,
  LoaderCircle,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import { useState } from 'react'
import DownloadQueue from '../components/Downloads/DownloadQueue'
import HeaderActions from '../components/HeaderActions'
import Marquee from '../components/Marquee'
import PageHeader from '../components/PageHeader'
import VideoCard from '../components/VideoCard'
import { config } from '../config'
import { dashboardFacade } from '../facades/dashboard'
import { label, muted } from '../styles'
import type { Dashboard } from '../types/dashboard'
import { formatBytes } from '../utils/format'

type Stat = { label: string; value: string; icon: LucideIcon; alert: boolean }

const emptyDashboard: Dashboard = {
  stats: { downloads: 0, storage: 0, queued: 0, failed: 0 },
  queued: [],
  recent: [],
}

const today = new Intl.DateTimeFormat(undefined, { weekday: 'long', day: 'numeric', month: 'long' })

function DashboardPage() {
  const { data = emptyDashboard } = dashboardFacade.useDashboard()
  const { stats: totals, queued, recent } = data
  const [date] = useState(() => today.format(new Date()))

  const stats: Stat[] = [
    { label: 'Downloads', value: String(totals.downloads), icon: Download, alert: false },
    { label: 'Storage', value: formatBytes(totals.storage), icon: HardDrive, alert: false },
    { label: 'Queued', value: String(totals.queued), icon: LoaderCircle, alert: totals.queued > 0 },
    { label: 'Failed', value: String(totals.failed), icon: TriangleAlert, alert: totals.failed > 0 },
  ]

  return (
    <main className="mx-auto max-w-7xl animate-fade-up space-y-8 px-4 py-6 motion-reduce:animate-none sm:space-y-10 sm:px-6 sm:py-10">
      <PageHeader eyebrow={date} title="Dashboard" actions={<HeaderActions />} />

      <section className="grid grid-cols-2 gap-px border border-primary/15 bg-primary/15 lg:grid-cols-4 dark:border-night-primary/15 dark:bg-night-primary/15">
        {stats.map(({ label: name, value, icon: Icon, alert }) => (
          <div key={name} className="bg-background p-4 sm:p-6 dark:bg-night-background">
            <div className="flex items-center justify-between gap-2">
              <p className={label}>{name}</p>
              <Icon size={16} className={alert ? 'text-accent dark:text-night-accent' : muted} />
            </div>
            <p
              className={`mt-4 font-serif text-3xl tabular-nums tracking-tight sm:text-5xl ${
                alert ? 'text-accent dark:text-night-accent' : ''
              }`}
            >
              {value}
            </p>
          </div>
        ))}
      </section>

      <DownloadQueue items={queued} />

      <section>
        <div className="flex items-end justify-between pb-4">
          <h2 className="font-serif text-2xl">Recent downloads</h2>
          <Link
            to="/downloads"
            className={`group flex items-center gap-1 text-sm hover:text-primary dark:hover:text-night-primary ${muted}`}
          >
            View all
            <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
        {recent.length === 0 ? (
          <p className={`border border-dashed border-primary/20 px-5 py-10 text-center text-sm dark:border-night-primary/20 ${muted}`}>
            No downloads yet. Paste a Facebook link to start your archive.
          </p>
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
  )
}

export default DashboardPage
