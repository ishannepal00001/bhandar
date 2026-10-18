import {
  ArrowRight,
  Download,
  HardDrive,
  LoaderCircle,
  TriangleAlert,
  type LucideIcon,
} from 'lucide-react'
import CurrentProgress from '../components/Dashboard/CurrentProgress'
import Marquee from '../components/Marquee'
import SearchBar from '../components/SearchBar'
import { current, recent, stats } from '../dummydata'

const statIcons: Record<string, LucideIcon> = {
  'Total Downloads': Download,
  'Storage Used': HardDrive,
  'In Progress': LoaderCircle,
  Failed: TriangleAlert,
}

const panel = 'border border-primary/15 dark:border-night-primary/15'
const muted = 'text-primary/60 dark:text-night-primary/60'

function Dashboard() {
  return (
    <div className="min-h-screen bg-background text-primary dark:bg-night-background dark:text-night-primary">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl">Dashboard</h1>
            <p className={`mt-1 text-sm ${muted}`}>
              An overview of your Facebook video downloads.
            </p>
          </div>
          <SearchBar />
        </div>

        <section className="flex flex-col gap-3 sm:grid sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          {stats.map((stat) => {
            const Icon = statIcons[stat.label]
            const change = (
              <>
                <span className="font-semibold text-accent dark:text-night-accent">
                  {stat.change}
                </span>{' '}
                {stat.note}
              </>
            )
            return (
              <div key={stat.label} className={panel}>
                {/* Mobile: one full-width row per stat */}
                <div className="flex items-center justify-between gap-4 p-4 sm:hidden">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center border border-primary/15 dark:border-night-primary/15">
                      <Icon size={18} className={muted} />
                    </span>
                    <div className="min-w-0">
                      <p className={`text-xs uppercase tracking-widest ${muted}`}>{stat.label}</p>
                      <p className={`mt-0.5 text-xs ${muted}`}>{change}</p>
                    </div>
                  </div>
                  <p className="shrink-0 font-serif text-2xl tabular-nums">{stat.value}</p>
                </div>

                {/* Larger screens: card grid */}
                <div className="hidden p-5 sm:block">
                  <div className="flex items-center justify-between">
                    <p className={`text-xs uppercase tracking-widest ${muted}`}>{stat.label}</p>
                    <Icon size={18} className={muted} />
                  </div>
                  <p className="mt-2 font-serif text-3xl">{stat.value}</p>
                  <p className={`mt-1 text-sm ${muted}`}>{change}</p>
                </div>
              </div>
            )
          })}
        </section>

        <CurrentProgress download={current} />

        <section>
          <div className="flex items-center justify-between pb-4">
            <h2 className="font-serif text-xl">Recent Downloads</h2>
            <button
              type="button"
              className={`flex items-center gap-1 text-sm underline-offset-4 hover:underline ${muted}`}
            >
              View all
              <ArrowRight size={14} />
            </button>
          </div>
          <Marquee items={recent} />
        </section>
      </main>
    </div>
  )
}

export default Dashboard
