import DownloadForm from '../components/Downloads/DownloadForm'
import DownloadQueue from '../components/Downloads/DownloadQueue'
import HeaderActions from '../components/HeaderActions'
import VideoCard from '../components/VideoCard'
import { downloadsFacade } from '../facades/downloads'
import { muted } from '../styles'
import type { FinalStatus } from '../types/downloads'
import { isFinished, isQueued, statusLabels } from '../utils/jobs'

const filters: { label: string; status: FinalStatus | null }[] = [
  { label: 'All', status: null },
  { label: statusLabels.completed, status: 'completed' },
  { label: statusLabels.failed, status: 'failed' },
  { label: statusLabels.cancelled, status: 'cancelled' },
]

function Downloads() {
  const { data: jobs = [] } = downloadsFacade.useDownloads()
  const filter = downloadsFacade.useDownloadStore((state) => state.filter)
  const queued = jobs.filter(isQueued)
  const finished = jobs.filter(isFinished)
  const videos = filter === null ? finished : finished.filter((job) => job.status === filter)

  return (
    <div className="min-h-screen bg-background text-primary dark:bg-night-background dark:text-night-primary">
      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:space-y-8 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="font-serif text-3xl">Downloads</h1>
            <p className={`mt-1 text-sm ${muted}`}>
              Paste a Facebook link to download it, and manage everything you’ve saved.
            </p>
          </div>
          <HeaderActions />
        </div>

        <DownloadForm />

        <DownloadQueue items={queued} />

        <section>
          <div className="flex flex-col gap-3 pb-4 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="font-serif text-xl">All Downloads</h2>
            <div className="flex border border-primary/15 dark:border-night-primary/15">
              {filters.map(({ label, status }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => downloadsFacade.setFilter(status)}
                  aria-pressed={filter === status}
                  className={`flex-1 px-4 py-1.5 text-sm sm:flex-none ${
                    filter === status
                      ? 'bg-primary text-background dark:bg-night-primary dark:text-night-background'
                      : `${muted} hover:text-primary dark:hover:text-night-primary`
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {videos.length === 0 ? (
            <p className={`text-sm ${muted}`}>No downloads here yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((job) => (
                <VideoCard key={job.id} job={job} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export default Downloads
